const express = require("express"),
  morgan = require("morgan"),
  fs = require("fs"),
  path = require("path"),
  bodyParser = require("body-parser"),
  uuid = require("uuid"),
  mongoose = require("mongoose"),
  Models = require("./models.js");

const { check, validationResult } = require("express-validator"); //middleware require validation via endpoints

//mongoose models
const Movies = Models.Movie;
const Users = Models.User;

const app = express();

//connection to mongodb
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const accessLogStream = fs.createWriteStream("log.txt", {
  flag: "a",
});

app.use(morgan("common"));
app.use(morgan("combined", { stream: accessLogStream }));
app.use("/documentation", express.static("public"));
app.use(express.json()); //new potential line
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cors = require("cors");



let allowedOrigins = [
  "http://localhost:8080",
  "http://testsite.com",
  "http://localhost:1234",
  "http://localhost:4200"
];

app.use(cors());


// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.indexOf(origin) === -1) {
//         // If a specific origin isn’t found on the list of allowed origins
//         let message =
//           "The CORS policy for this application doesn’t allow access from origin " +
//           origin;
//         return callback(new Error(message), false);
//       }
//       return callback(null, true);
//     },
//   })
// );



let auth = require("./auth")(app);
const passport = require("passport");
require("./passport");

// CREATE

/** 
 * POST new user upon registration if a matching user is not found.
 * Perform checks on Username, Password and Email fields +
 * Hash the user's password
 * @name registerUser
 * @kind function
 * @returns new user object
*/

app.post(
  "/users",

  [
    check("Username", "Username must be atleast 5 characters").isLength({
      min: 5,
    }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  (req, res) => {
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username }) //searches to see if user exists

      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + "already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

// UPDATE

/**
 * PUT updated user info, by Username
 * Perform checks on Username, Password and Email fields
 * Hash the user's password
 * Reguest: Bearer token, user object
 * @name updateUser
 * @kind function
 * @param {string} Username user's Username
 * @requires passport
 * @returns A JSON object holding the updated user data, including their ID
 */
app.put(
  "/users/:Username",

  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOneAndUpdate(
      
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true }, //This line makes sure that the updated document is returnded
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

/**
 * POST movie to user's list of favorites
 * Request: Bearer token
 * @name addFavorite
 * @kind function
 * @param {string} Username user's Username
 * @param {string} MovieID id of the movie
 * @requires passport
 * @returns the user object with the new favorite movie added to the FavoriteMovies array
 */
app.post(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { favoriteMovies: req.params.MovieID },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

// READ

/** 
 * send index.html file at endpoint "/"
*/
app.get("/", (req, res) => {
  res.send("Welcome to myFlix!");
});

app.get("/documentation.html", (req, res) => {
  res.sendFile("public/documentation.html", { root: __dirname });
});

//authenticate user for get all movies via jwt token
app.get(
  "/movies",
  // passport.authenticate("jwt", { session: false }), *this turned off for my client
  (req, res) => {
    Movies.find()
      .then((movies) => {
        res.status(200).json(movies);
      })
      .catch((error) => {
        console.error(error);
        res.status(404).send("Error " + error);
      });
  }
);

/**
 * GET a list of all movies
 * request: bearer token
 * @name getMovies
 * @kind function
 * @requires passport
 * @returns the movies array of objects
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find()
      .then((movies) => {
        res.status(200).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Error:" + err);
      });
  }
);

/**
 * GET data about a single movie by title
 * @name getMovie
 * @kind function
 * @param {string} Title title of the movie
 * @requires passport
 * @returns the movie object
 */
app.get(
  "/movies/:title",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.title })
      .then((movie) => {
        res.json(movie);
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Error: " + err);
      });
  }
);

/**
 * GET data about a genre, including matching movies, by name
 * @name getGenre
 * @kind function
 * @param {string} Name the name of the genre
 * @requires passport
 * @returns A JSON object holding the name, description and movies of a genre
 */
app.get(
  "/movies/genres/:genreName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ "Genre.Name": req.params.genreName })
      .then((genre) => {
        res.json(genre.Genre);
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Error: " + err);
      });
  }
);

/**
 * GET data about a director, including matching movies, by name
 * @name getDirector
 * @kind function
 * @param {string} Name the name of the director
 * @requires passport
 * @returns A JSON object holding data about the specified director including their movies
 */
app.get(
  "/movies/directors/:directorName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ "Director.Name": req.params.directorName })
      .then((director) => {
        res.json(director.Director);
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Error: " + err);
      });
  }
);

/**
 * GET all Users
 * @requires passport
 */
app.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.find()
      .then((users) => {
        res.status(200).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Error: " + err);
      });
  }
);

/**
 * GET a user by Username
 * request: bearer token
 * @name getUser
 * @kind function
 * @param {string} Username user's Username
 * @requires passport
 * @returns the user object
 */

app.get(
  //gets all users via username and jwt token
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOne({ Username: req.params.Username })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Error " + err);
      });
  }
);

/**
 * DELETE user
 * requires bearer token
 * @name deleteUser
 * @kind function
 * @param {string} Username user's Username
 * @requires passport
 * @returns A text message indicating whether the user was successfully deregistered 
 */
app.delete(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndRemove({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          res.status(404).send(req.params.Username + " was not found");
        } else {
          res.status(200).send(req.params.Username + " was deleted");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Error: " + err);
      });
  }
);

// DELETE

/**
 * DELETE a movie from user's list of favorites
 * requires bearer token
 * @name deleteFavorite
 * @kind function
 * @param {string} Username user's Username
 * @param {string} MovieID movie's ID
 * @requires passport
 * @returns a message to the user stating that the movie has been removed
 */

app.delete(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: { favoriteMovies: req.params.MovieID },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Error, test error");
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});
