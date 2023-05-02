var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectID
var Razorpay = require('razorpay')
var keys = require('./keys')
var instance = new Razorpay({
    key_id: keys.key_id,
    key_secret: keys.key_secret,
});
module.exports = {
    doSignUp: (userData) => {
        return new Promise(async (resolve, reject) => {
            let passwordHash = await bcrypt.hash(userData.password, 10)
            let user = {
                ...userData,
                cpassword: passwordHash,
                password: passwordHash
            }
            let res = await db.get().collection(collection.USER_COLLECTION).insertOne(user)
            resolve(res.ops[0])
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        resolve({ status: false })
                    }
                })
            } else {
                resolve({ status: false })
            }

        })
    },
    addToCart: (prodId, userId) => {
        return new Promise(async (resolve, reject) => {
            let proObj = {
                item: objectId(prodId),
                quantity: 1
            }
            let cartobj = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cartobj) {
                console.log(cartobj.products)
                let proExist = cartobj.products.findIndex(prod => prod.item == prodId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId), 'products.item': objectId(prodId) }, {
                        $inc: { 'products.$.quantity': 1 }
                    }).then(() => {
                        resolve({ status: true })
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) }, {
                        $push: {
                            products: proObj
                        }
                    }).then(() => {
                        resolve({ status: true })
                    })
                }
            } else {
                db.get().collection(collection.CART_COLLECTION).insertOne({
                    user: objectId(userId),
                    products: [proObj]
                }).then(() => {
                    resolve({ status: true })
                })
            }

        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ["$product", 0] }
                    }
                }
            ]).toArray()
            resolve(cart)
        })
    },
    getCartLength: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $group:
                    {
                        _id: null,
                        total: { $sum: '$products.quantity' }
                    }
                }
            ]).toArray()
            console.table(cart)
            if (cart.length) {
                resolve(cart[0].total)
            } else {
                resolve(0)
            }
        })
    },
    changeProductQuantity: (details) => {
        return new Promise((resolve, reject) => {
            if (details.count === -1 && details.quantity === 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cartId) }, {
                    $pull: { products: { item: objectId(details.prodId) } }
                }).then(() => {
                    resolve({ removed: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cartId), 'products.item': objectId(details.prodId) }, {
                    $inc: { 'products.$.quantity': details.count }
                }).then(() => {
                    resolve({ updated: true })
                })
            }
        })
    },
    deleteCartProduct: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cartId) }, {
                $pull: { products: { item: objectId(details.prodId) } }
            }).then(() => {
                resolve({ removed: true })
            })
        })
    },
    getCartTotal: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ["$product", 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ["$quantity", "$product.price"] } }
                    }
                }
            ]).toArray()
            if (cart.length === 0) {
                resolve(0)
            } else {
                resolve(cart[0].total)
            }
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).find({ user: objectId(userId) }).toArray()
            resolve(cart[0].products)
        })
    },
    removeCart: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).removeOne({ user: objectId(userId) }).then(() => {
                resolve()
            })
        })
    },
    placeOrder: (details, products, total) => {
        return new Promise((resolve, reject) => {
            let status = details['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                delivery: {
                    address: details.address,
                    city: details.city,
                    state: details.state,
                    zip: details.zip,
                    mobile: details.mobile,
                },
                'payment-method': details['payment-method'],
                user: objectId(details.user),
                products,
                total,
                status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                resolve(response.ops[0]._id)
            })

        })
    },
    getAllOrders: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find({ user: objectId(userId) }).toArray().then((response) => {
                let orders = []
                response.map((e) => {
                    e.date = e.date.toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })
                    orders.push(e)
                })
                resolve(orders)
            })
        })
    },
    getOrderDetails: (userId, orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId), _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        quantity: '$products.quantity',
                        total: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        total: { $first: '$total' },
                        item: {
                            $push: {
                                product: '$product',
                                quantity: '$quantity'
                            }
                        }
                    }
                }
            ]).toArray().then((response) => {
                resolve(response)

            })
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err)
                } else {
                    resolve(order)
                }
            });
        })
    },
    verifyPayment: (order) => {
        return new Promise((resolve, reject) => {
            var crypto = require('crypto');
            var hmac = crypto.createHmac('sha256', keys.key_secret);
            hmac.update(order.order.id + "|" + order.payment['razorpay_payment_id'])
            hmac = hmac.digest('hex')
            if (hmac === order.payment['razorpay_signature']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changeOrderStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'placed'
                }
            }).then(() => {
                resolve()
            })
        })
    }
}