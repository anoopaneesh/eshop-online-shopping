const MongoClient = require('mongodb').MongoClient;
const state = {
    db: null
}
module.exports = {
    connect:  (done) => {

        
        const uri = process.env.MONGODB_URI;
        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        client.connect(err => {
            if(err){
                return done(err)
            }
            state.db = client.db("shopping")
            done()
        });



    },
    get: () => {
        return state.db
    }
}