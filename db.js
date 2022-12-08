const mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config({ path: './config.env' });
const mongoURI = process.env.MONGO || "mongodb+srv://tushar:Bf9Z7Lgqw8xcTA0x@cluster0.3zsfvdw.mongodb.net/atg";

const connectToDb = () => {
    mongoose.connect(mongoURI, () => {
        console.log("connected to MongoDb");
    })
}

module.exports = connectToDb;