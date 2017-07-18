var express = require('express');
var router = express.Router();

router.get('/', function(req, res){
    res.sendFile(__dirname + '/things.html');
});

router.post('/', function(req, res){
    res.send('POST route on things.');
});

module.exports = router;
