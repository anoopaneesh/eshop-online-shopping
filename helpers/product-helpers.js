var db = require('../config/connection')
var collection = require('../config/collections')
var objectId = require('mongodb').ObjectID
module.exports = {
    addProduct : (product,callback) => {
        db.get().collection('product').insertOne(product).then((data)=>{
            callback(data.ops[0]._id)
        })
    },
    getAllProducts : () => {
        return new Promise(async(resolve,reject)=>{
            const products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({
                _id:objectId(prodId)
            }).then((response)=>{
                console.log(response)
                resolve(response)
            })
        })
    },
    getProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({
                _id:objectId(prodId)
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    updateProduct:(prodId,product)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).update({_id:objectId(prodId)},{
                $set:{
                    name:product.name,
                    price:product.price,
                    description:product.description
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    }
}