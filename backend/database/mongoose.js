const mongoose = require('mongoose');
/*Promises for async code which takes time to complete, we dont want app to freeqe till then*/ 
mongoose.Promise = global.Promise;

mongoose.connect('mongodb://127.0.0.1:27017/imagesearcher',{useNewUrlParser: true,useUnifiedTopology: true})
    .then(() => console.log("Database Connected"))
    .catch((error) => console.log(error));

module.exports = mongoose;