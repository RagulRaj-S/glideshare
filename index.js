const express=require('express');
const app=express();
const bodyParser = require('body-parser');
const cors=require('cors');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const crypto = require('crypto');
const path = require('path');
const multer=require('multer');
const GridFsStorage = require('multer-gridfs-storage');

app.use(cors())
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json());

let gfs;
const conn = mongoose.createConnection('mongodb+srv://sanjay:sanjayragul@glideshare.9so47.mongodb.net/glideshare?retryWrites=true&w=majority');

conn.once('open', function () {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')
})

const storage = new GridFsStorage({
    url: 'mongodb+srv://sanjay:sanjayragul@glideshare.9so47.mongodb.net/glideshare?retryWrites=true&w=majority',
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads',
            aliases:[file.originalname,Date.now()]
          };
          resolve(fileInfo);
        });
      });
    }
});

const upload = multer({ storage });

const nodemailer=require('nodemailer')

let transporter=nodemailer.createTransport({
  service:'gmail',
  auth:{
    user:'glideshare.send@gmail.com',
    pass:'SanjuRaju@0508'
  }
})


app.post('/:email', upload.single('file'), (req,res)=>{
  try{
    console.log(req.file);
    console.log(req.params.email);
    let link=`https://glide-share.herokuapp.com/image/${req.file.filename}`
    let mailOptions={
        from:'glideshare.send@gmail.com',
        to:req.params.email,
        subject:'Notification from Glide Share',
        text:`Hey you!\n\nYou have received some file through Glide Share. You can download it from here: ${link} \n\nThank you`
    }
    transporter.sendMail(mailOptions,(err,data)=>{
      if(err){
        res.status(500)
        res.json({msg:'Internal server error'})
      }else{
        res.status(200)
        res.json({
          filename:req.file.originalname,
          id:req.file.id,
          size:req.file.size,
          uploadDate:req.file.uploadDate
        })
      }
    })
  }
  catch(err){
    res.status(500)
    res.json({msg:'Internal server error'})
  }
})

app.get('/files' , (req, res) => {
    gfs.files.find().toArray((err, files) => {
      if(!files || files.length === 0) {
        return res.status(404).json({
          err:'No files exist'
        });
      }  
      return res.json(files);
    });
  });

app.get('/files/:filename' , (req, res) => {
    gfs.files.findOne({ filename: req.params.filename},(err, file) => {
      if(!file || file.length === 0) {
        return res.status(404).json({
          err:'No file exist'
        });
      }  
      return res.json(file);
    });
  });

//   app.post('/:email', upload.single('file'), (req,res)=>{
//     //res.json({ file: req.file});
//     console.log(req.file);
//     console.log(req.params.email);
//   });

  app.get('/image/:filename' , (req, res) => {
    gfs.files.findOne({ filename: req.params.filename},(err, file) => {
      if(!file || file.length === 0) {
        return res.status(404).json({
          err:'No file exist'
        });
      }  
      //if(file.contentType === 'image/jpeg' || file.contentType === 'img/png' ) {
            var readstream = gfs.createReadStream(file.filename);
             readstream.pipe(res);

      //}else {
        //   res.status(404).json({
        //     err:'Not an img'
        //   });
      //}

    });
  });

app.use(express.static('client/dist'))
app.get('*',(req,res)=>{
  res.sendFile(path.join(__dirname,'client','dist','index.html'))
})

app.listen(process.env.PORT||5000);