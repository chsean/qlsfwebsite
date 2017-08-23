var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

//FORM stuff
var fs = require('fs');
var formidable = require("formidable");
var util = require('util');
//END FORM STUFF

//MAIL STUFF
var api_key = 'key-d9768f5643fb0645f53772b9be721440';
var domain = 'sandbox243735a582fe4639ac04b13701811cd2.mailgun.org';
var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

//END MAIL STUFF


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

//start sean stuff

app.post('/joblistings/*',function(req,res,next){
    processFormFieldsIndividual(req, res, next);
});
//end sean stuff

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;



//form stuff


// function displayForm(res) {
//     fs.readFile('form.html', function (err, data) {
//         res.writeHead(200, {
//             'Content-Type': 'text/html',
//                 'Content-Length': data.length
//         });
//         res.write(data);
//         res.end();
//     });
// }

// function processAllFieldsOfTheForm(req, res) {
//     var form = new formidable.IncomingForm();
//
//     form.parse(req, function (err, fields, files) {
//         //Store the data from the fields in your data store.
//         //The data store could be a file or database or any other store based
//         //on your application.
//         res.writeHead(200, {
//             'content-type': 'text/plain'
//         });
//         res.write('received the data:\n\n');
//         res.end(util.inspect({
//             fields: fields,
//             files: files
//         }));
//     });
// }

function processFormFieldsIndividual(req, res, next) {
    //Store the data from the fields in your data store.
    //The data store could be a file or database or any other store based
    //on your application.

    var fields = {};
    var form = new formidable.IncomingForm();
    form.keepExtensions = true;
    //Call back when each field in the form is parsed.
    form.on('field', function (field, value) {
        // console.log(field);
        // console.log(value);
        fields[field] = value;
    });


    //Call back when each file in the form is parsed.
    form.on('file', function (name, file) {
        // console.log(name);
        // console.log(file);
        var fileType = file.type.split('/').pop();
        if (fileType != 'jpg' && fileType != 'png' && fileType != 'doc' && fileType != 'docx' && fileType != 'pdf') {
          // throw new Error("Your resume must be a jpg, png, doc, docx, or pdf.");
          res.end("Your resume must be a jpg, png, doc, docx, or pdf.");
          return;
        }
        if (file.size > 5000000) {
          res.end("Your resume must be less than 5 MB.");
          return;
        }
        fields[name] = file.path;
        // console.log(file.path);


        //Storing the files meta in fields array.
        //Depending on the application you can process it accordingly.
    });



    //Call back for file upload progress.
    form.on('progress', function (bytesReceived, bytesExpected) {
        var progress = {
            type: 'progress',
            bytesReceived: bytesReceived,
            bytesExpected: bytesExpected
        };
        //console.log(progress); to clean up my bash for now.
        // if (progress.bytesExpected > 5000000) {
        //   throw new Error('Your resume must be under 5 MB.');
        // }
        //Logging the progress on console.
        //Depending on your application you can either send the progress to client
        //for some visual feedback or perform some other operation.
    });

    //Call back at the end of the form.
    form.on('end', function () {
        /* THIS WAS FOR DEBUGGING.
        res.writeHead(200, {
            'content-type': 'text/plain'
        });
        res.write('received the data:\n\n');
        //stringifies the collected data
        res.end(util.inspect({
            fields: fields
        }));

        */
        mailHandler(fields);
        //alert("Thank you for your application! We will contact you shortly if we find you are a good fit.");
        res.end('Thank you for your application! We will contact you shortly if we find you are a good fit.');
    });

    form.parse(req);
}

//Fields is a dictionary whos keys are the fields and
function mailHandler(fields) {
  var body = formatBody(fields);
  var data = {
    from: "sean <postmaster@sandbox243735a582fe4639ac04b13701811cd2.mailgun.org>",
    to: 'careers@qlsfbio.com',
    subject: 'Incoming Job Application',
    text: body,
    attachment: fields['resume']
    //fields['resume']
  };

  if (fields['resume']) { //checks to make sure that the user properly uploaded their resume before sending the email.
    mailgun.messages().send(data, function (error, body) {
      console.log(body);
    });
  }
}

function formatBody(fields) {
  var body = "You have an incoming job application. The applicant's information is shown below:\n\n";
  var keys = Object.keys(fields);
  for (var i = 0; i < keys.length - 1; i++) { //it's -1 because the last one is the resume
    body += keys[i] + "\n";
    body += fields[keys[i]] + "\n\n";
  }
  return body;
}

//end form stuff
