var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectID
module.exports = {
    getAllOrders: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find({ status: 'placed' }).toArray().then((response) => {
                console.log(response)
                resolve(response)
            })
        })
    },
    approveOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'shipped'
                }
            }).then(() => {
                resolve()
            })
        })
    },
    doLogin: (details) => {
        return new Promise(async (resolve, reject) => {
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: details.email })
            let result = {}
            if (admin) {
                console.log(admin, details)

                bcrypt.compare(details.password, admin.password).then((response) => {
                    if (response) {
                        result.admin = admin
                        result.status = true
                        resolve(result)
                    } else {
                        resolve({ status: false })
                    }
                })
            } else {
                resolve({ status: false })
            }
        })
    }
}