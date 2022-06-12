const express = require('express'),
morgan = require('morgan'), //middleware 
fs = require ('fs'), //built in node modules (fs,path)
path = require ('path');

const app = express();

//a 'log.txt' file is created in root directory.  also creates write stream via append mode
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags:'a'});



let topMovies = [
    {
        title: 'Hereditary',
        director: 'Ari Aster'
    },
    {
        title: 'Apocalypto',
        director: 'Mel Gibson'
    },
    {
        title: 'The Dark Knight',
        director: 'Christopher Nolan'
    },
    {
        title: 'The Revenant',
        director: 'Alejandro G. Inarritu'
    },
    {
        title: 'Once Upon a Time in Hollywood',
        director: 'Quentin Tarantino'
    },
    {
        title: 'The Shawshank Redemption',
        director: 'Frank Darabont'
    },
    {
        title: 'Top Gun: Maverick',
        director: 'Josheph Kosinski'
    },
    {
        title: 'Get Out',
        director: 'Jordan Peele'
    },
    {
        title: 'The Patriot',
        director: 'Dean Semler'
    },
    {
        title: 'The Sixth Sense',
        director: 'M. Night Shyamalan'
    }
];


// routes all requests for static files to corresponding files within 'public' folder


//get requests

app.get('/',(req,res)=>{
    res.send('Welcome to the most creative movies on the planet!');
});

app.get('/movies',(req,res)=>{ //returns json movie data from topMovies
    res.json(topMovies);
});

//serves documentation.html from the public folder rather than using http,url,and fs
app.get('/documentation', (req,res)=>{
    res.sendFile('public/documentation.html', {root: __dirname});
});

//middleware functions
app.use(morgan('combined', {stream:accessLogStream})); //logger setup

app.use(express.static('public')); //auto routes all static files to public folder

app.use ((err,req,res,next)=>{
console.error(err.stack);
res.status(500).send('uh oh, something went wrong!');
});

//listen for requests
app.listen (8080,()=>{
    console.log('your app is listening on port 8080.');
});