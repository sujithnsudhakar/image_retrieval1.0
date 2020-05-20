const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path')
const fs = require('fs')
const app = express();
const spawn = require('child_process').spawn;
const highchart = require('highcharts/highstock');

//Configure middleware using bodyParser
app.use(bodyParser.urlencoded({extended:true}))

const mongoose = require('./database/mongoose')
const RImages = require('./database/models/repoImages');
const QImages = require('./database/models/queryImages');

//substitute to body-parser
var busboy = require('connect-busboy');
app.use(busboy()); 

/*Enable json parsing, substitution of body parser*/
app.use(express.json());

/*CORS Cross origin resource sharing
localhost:3000 - backend api
localhost:4200 - frontend
*/ 
var publicDir = require('path').join('','../backend/image_dir/CIFAR/');
app.use('/static',express.static(publicDir));

//app.use(cors());
app.use(cors({
  exposedHeaders: ['Content-Length', 'qId'],
}));


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/',(req,res)=>{
  res.sendFile(__dirname,'../frontend/index.html');
});

//Store in local storage after filtering the file types to image --Start
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'E:/OVGU/Sem2_Summer2020/Subjects/Project/image_dir/')
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname/*fieldname + '-' + Date.now()*/)
    }
  })
  const fileFilter=(req, file, cb)=>{
    if(file.mimetype ==='image/jpeg' || file.mimetype ==='image/jpg' || file.mimetype ==='image/png'){
        cb(null,true);
    }else{
        cb(null, false);
    }  
   }
  
 var upload = multer({ 
     storage:storage,
    limits:{
         fileSize: 1024 * 1024 * 500
     },
     fileFilter:fileFilter
  });
  //The method is called on click of upload button
  app.post('/fileupload', upload.single('file'), (req, res, next) => {
    console.log('req.files',req.file);
    var file = req.file
    let data = [];
    console.log('Type of File: ',typeof(file));
    if (!file) {
      const error = new Error('Please upload a file')
      error.httpStatusCode = 400
      return next(error)
    }
    new RImages({'fieldname': req.file.fieldname,'originalname': req.file.originalname,
    'encoding': req.file.encoding, 'mimetype': req.file.mimetype,'destination':req.file.destination,
    'filename':req.file.filename,'path':req.file.path,'size':req.file.size
    }).save()
    .then((list) => res.send(list))
    .catch((error)=>console.log(error));
  })
  
app.get('/lists',(req,res) => {
    List.find({})
        .then(lists => res.send(lists))
        .catch((error) => console.log(error))
});
app.post('/postimage',(req,res) => {
    //Send the control to run python script, now simply add metadata into db to fetch
    new RImages({'title': req.body.title,'path': req.body.path,'imgtype': req.body.imgtype})
    //new List({'title': req.body.title})
    .save()
    .then((list) => res.send(list))
    .catch((error)=>console.log(error));
});
//Test method, we will pass one image id from UI to fetch matches
app.get('/lists/:listId',(req,res) => {
    List.find({ _id: req.params.listId})
        .then((list) => res.send(list))
        .catch((error) => console.log(error))
})
//Execute python code on click of Search button
app.post('/runscript', upload.single('file'), (req, res,next) => {
  console.log('req.files',req.file);
  var file = req.file
    if (!file) {
      const error = new Error('Please upload a file')
      error.httpStatusCode = 400
      return next(error)
    }    
    new QImages({'fieldname': req.file.fieldname,'originalname': req.file.originalname,
    'encoding': req.file.encoding, 'mimetype': req.file.mimetype,'destination':req.file.destination,
    'filename':req.file.filename,'path':req.file.path,'size':req.file.size
    }).save().then((image) => {
      console.log('List after saving query Image',image._id);
      res.setHeader('qId', image._id);
    }).catch((error)=>console.log(error));

    fileName = req.file.filename
    var process = spawn('python',['q2.py',fileName]);

    // Takes stdout data from script which executed 
    process.stdout.on('data', function(data) { 
    //console.log(type(data.toString()))
    var temp = data.toString().replace(/\n|\r/g, "");
    res.json(temp);
})
})
app.post('/persistQueryObj',(req, res, next) => {
  var qRelatedImages = [];
  var queryId = req.body[0];
  var repoImage = req.body[1];
  var id = mongoose.Types.ObjectId(queryId)
  QImages.findOneAndUpdate(
    {
      _id: id
    }, 
    {
      $push: { relatedImages: repoImage.ObjectId  }
    },
    {
      new: true,                      
      runValidators: true              
    })
  .then(doc => {
    console.log(doc)
  })
  .catch(err => {
    console.error(err)
  })
});

app.listen(3000,() =>{
  var cp = spawn('python',['q1.py']);
  cp.stdout.on('data', function(data){ 
  var temp = data.toString();
  console.log(temp)
  })
  console.log("Server connected to port 3000");
});

