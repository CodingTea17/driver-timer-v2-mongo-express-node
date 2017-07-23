// Look into this...It is there to allow "Block-scoped declarations (let, const, function, class"...?
"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var mongoose = require('mongoose');
var path = require("path");
var app = express();

// connects to my mongodb "my_db" database
mongoose.connect('mongodb://pg:pizzaguys@ds034807.mlab.com:34807/pizzaguys', {useMongoClient: true});

var driverSchema = mongoose.Schema({
    name: String,
    phone_number: Number,
    store_number: Number,
    should_beep: Boolean,
    timeback: Number
});

var Driver = mongoose.model("Driver", driverSchema);

// Tells server to use pug
app.set('view engine', 'pug');
app.set('views', './views');
// Tells server to look in the 'views' folder

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(upload.array()); // for parsing multipart/fomr-data
app.use(express.static(__dirname + '/public'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/audio',  express.static(__dirname + '/audio'));

// var things = require('./things.js');
// app.use('/things', things);

/************************************************************
    Handles inbound sms messages. Actually has a compressed
    javascript function. Now do it to the others!!!!!
************************************************************/
app.get('/inbound', function(req, res) {
  //calls function to handle the sms
  handleParams(req.query, res);
});

app.get('/:id([0-9]{3})', function(req, res, next){
    var id =  req.params.id;
    //Finds drivers associated with the request id aka store number
    Driver.find({store_number:req.params.id}, function(err,drivers){
        if (err) return res.send(500, { error: err });
        
        // Stringifys the json object...May not be neccessary?
        JSON.stringify(drivers);
        
        // Sorts drivers by the one who's timer is expiring last
        drivers.sort(function(x, y){
            //console.log(x.name + " " + y.name);
            return y.timeback - x.timeback;
        });
        
        res.render('drivertimer.pug',{data:drivers, id});

        });
     
    //Sends the app to the middleware which 
    next();
});

/************************************************************
    Middleware which executes a script (eventually need 
    to compress into functions) after rendering the page.
************************************************************/
app.use('/:id([0-9]{3})', function(req, res){
    // Selects all the drivers with the store id of the request
    var start = Date.now();
    var end = Date.now() - 5000;
    var myquery = {store_number:req.params.id, timeback:{ $lt : start, $gt : end }};
    
    // Gathers the time the driver will be back
    var newvalues = { should_beep: false };
    // Finds an entry based on 'myquery'. 'upsert': means create one if not found 
    Driver.updateMany(myquery, newvalues, {upsert:false}, function(err, doc){
        if (err) return res.send(500, { error: err });
    });
});


/************************************************************
    Middleware which executes a script (eventually need 
    to compress into functions) after rendering the page.
************************************************************/
app.get('/driversetup/:id([0-9]{3})', function(req, res) {
    var id = '/driversetup/' + req.params.id;
    res.render('driver_form.pug', {store_id: id});
});

/************************************************************
    Middleware which executes a script (eventually need 
    to compress into functions) after rendering the page.
************************************************************/
app.post('/driversetup/:id([0-9]{3})', function(req, res){
    //Gets the store number from url request. Ex. '/driversetup/177', 'id = 177'
    var id = req.params.id;
    
    var driverInfo = req.body; //Gets the parsed info from the form
    
    // if(!driverInfo.name || driverInfo.phone_number){
    //     res.render('show_message', {message: "Sorry, you did not complete the form..."})
    // }
    // else {}
    
    var newDriver = new Driver({
        name: driverInfo.name,
        phone_number: 1 + driverInfo.phone_number,
        store_number: id,
        should_beep: false
    });
    
    newDriver.save(function(err, Driver){
        if(err)
        res.render('show_message', {message: "Database error", type:"error"});
        else
        res.render('show_message', {message: "New driver added", type: "success", driver: driverInfo});
    });
});

// Returns an error message to all other routes.
// app.get('*', function(req, res){
//      res.send('Sorry, this is an invalid URL');
// });

app.listen(process.env.PORT || 3000);

  
function handleParams(params, res) {
  if (!params.to || !params.msisdn) {
    console.log('This is not a valid inbound SMS message!');
  } else {
    let incomingData = {
      messageId: params.messageId,
      from: params.msisdn,
      text: params.text,
      type: params.type,
      timestamp: params['message-timestamp']
    };
    //INSERT FUNCTION TO ROUTE MESSAGES (todo: make seperate function)
    
    // generates a query by the number who sent to text
    var myquery = {phone_number: incomingData.from };
    
    // Gathers the time the driver will be back
    var newvalues = { timeback: (Date.parse(incomingData.timestamp) + (incomingData.text * 60000)), should_beep: true};
    
    //var query = {'username':req.user.username};
    //req.newData.username = req.user.username;
    
    // Finds an entry based on 'myquery'. 'upsert': means create one if not found 
    Driver.findOneAndUpdate(myquery, newvalues, {upsert:false}, function(err, doc){
        if (err) return res.send(500, { error: err });
        //return res.send("succesfully saved");
    });
    
    
    console.log(incomingData.from);
    console.log('Success. Message sent at: ' + (Date.parse(incomingData.timestamp) + '.'));
    console.log('Success. Driver to return at: ' + (Date.parse(incomingData.timestamp) + (incomingData.text * 60000) + '.'));
    
    //console.log(parseInt(incomingData.text));
    //storage.setItem('id_' + params.messageId, incomingData);
    //res.send(incomingData);
  }
  res.status(200).end();
}



// Using Mongoose Streams

// Finally, Mongoose has also support for streams and streams are event emitters. So, you could get a stream and then subscribe for 'data' and 'error' events. Like this:

// function getjedisStream(name){
//   var stream = Jedi.find({name:name}).stream();
//   return stream;
// }
// Then you can simply do:

// var stream = getJedisStream('Anakin');
// stream.on('data', function(jedis){
//   jedis.forEach(function(jedi){
//       console.log(jedi.name);
//   });
// });
// stream.on('error', function(error){
//     console.log(error);
// });