/* Instructions:
To run the file use node App.js in terminal after installing required files.
Use localhost:8080/ in the browser to launch the page.
Start the MongoDB Server by entering in mongodb://localhost:27017 in compass
Create the table first by going to /collection
To create a new user, go to register button.
To Login into an existing account, go to login.
To go to user profile use localhost:8080/profile.
To upload, use the /profile URI to upload image and text
To delete account, use button "delete".
To log out of an account, use logout button. */

//Requirements for file
// ////////////////////////////////


//Requirements for file
const express = require('express')
//installs a unique session to every user. Stores state
const session = require('express-session')
const bodyParser = require('body-parser')
// Connection client to mongoDB
const MongoClient = require('mongodb').MongoClient;//4-10
// var assert = require('assert');//-4-10
const binary = MongoClient.Binary;
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

const app = express()
Grid.mongo = mongoose.mongo;

//4-10 Connection URL
const url = 'mongodb://localhost:27017';

const path = require('path');
const crypto = require('crypto');
const methodOverride = require('method-override');

//Database Name 4-10
const dbName = 'finalproject';

//creating new MongoClient 4-10
const client = new MongoClient(url);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');


//creating new mongoose connection
const conn = mongoose.createConnection(`${url}/${dbName}`, { useNewUrlParser: true, useUnifiedTopology: true });

// Init gfs
let gfs;

conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

// Create storage engine
/*const storage = new GridFsStorage({
    url: `${url}/${dbName}`,
    file: (req, file) => {
        const { userId } = req.session
        return new Promise((resolve, reject) => {
            const filename = file.originalname;
            const fileInfo = {
                filename: filename,
                bucketName: 'customers',
                userId: userId,
                metadata: {
                    userId: userId,
                },
            };
            resolve(fileInfo);
        });
    },
    useUnifiedTopology: true,
    useNewUrlParser: true
});*/

const storage = new GridFsStorage({
    url: `${url}/${dbName}`,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });

//in Miliseconds
const ONE_HOUR = 3600000;
//process.env is a global variable. Represents state of environment
//the application is in when it starts.
const {
    PORT = 8080, SESSION_LIFETIME = ONE_HOUR,
    NOD_ENV = 'development', SESS_NAME = 'sessionid', SESSION_SECRET = 'secret'
} = process.env


const IN_PROD = NOD_ENV === 'production'

//Creating the users to be used
const users = [
    { id: 1, name: 'Jason', email: 'fakeprojectemail@gmail.com', password: 'secret' },
    { id: 2, name: 'Emily', email: 'fakemail@gmail.com', password: 'secret' },
    { id: 3, name: 'Max', email: 'nonexist@gmail.com', password: 'secret' },

]
//Creating the file info
//const fileInfo = [{filename: '777929781.jpg', bucketName: 'customers', userId: 'Image FILE', metadata: '777929781'}
//Redirects the user if not already logged in
const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/login')
    } else {
        next()
    }
}

//User Authentication check
const redirectHome = (req, res, next) => {
    console.log(req.session)
    if (req.session.user) {
        res.redirect('/home')
    } else {
        next()
    }
}

// User redirects to login
const redirectProfile = (req, res, next) => {
    console.log("session", req.session)
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next()
    }
}

// User redirects to user profile
const redirectUserProfile = (req, res, next) => {
    if (req.session.user) {
        res.redirect('/profile')
    } else {
        next()
    }
}

//middleware. Session is used as a function
app.use(session({
    //unique name for the session. Secret is true to stop cookie from being changed
    name: SESS_NAME, resave: false, saveUninitialized: false,
    secret: SESSION_SECRET,
    //resave controls if the session needs to be saved to session store
    cookie: {
        maxAge: SESSION_LIFETIME,
        //accepts only cookie in the domain attribute.
        sameSite: true,
        secure: IN_PROD
    }
}))

// This uses the session of the request
app.use((req, res, next) => {
    const { user } = req.session;
    if (!user) {
        req.session.user = null;
    } else if (user && user._id) {
        res.locals.user = user;
    }
    next();
})

app.use((req, res, next) => {
    const {userId} = req.session
    if (userId) {
        res.locals.user = users.find(user => user.id == userId)
    }
    next()
})

//Creating a table/collection
app.get('/collection', function (exp_req, exp_res) {
    //var text = '';
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.error(err);
            return;
        }
        var dbo = db.db('finalproject');
        dbo.createCollection('customers', function (err, res) {
            if (err) {
                console.error(err);
                return;
            }
            console.log('Collection created!'); // like a table in SQL DBs
            //text += 'Collection created';
            //exp_res.send(text);
            db.close();
        });

    });
    //var text = '';
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.error(err);
            return;
        }
        var dbo = db.db('finalproject');
        dbo.createCollection('customersUpload', function (err, res) {
            if (err) {
                console.error(err);
                return;
            }
            console.log('Collection upload created!'); // like a table in SQL DBs
            //text += 'Collection created';
            //exp_res.send(text);
            db.close();
        });

    });
});




//The main root page of the website
app.get('/', (req, res) => {
    const { userId } = req.session;
    const gfs = Grid(conn.db);

 /*   console.log("main", user)
    console.log("main", req.session.user)
    //Checking for user id using userId ?
    res.send(`<h1>Welcome to the Project HomePage!</h1>
        ${user && user._id ? '' : `<a href='/login'>Login</a>
        <a href='/register'>Register</a>
        `}
        <a href='/home'>Home</a>
        <a href='/profile'>Profile</a>
        <form method='post' action='/logout'>
        <button>Logout</button>
        </form>
    `)
})*/
    res.send(`<h1>Welcome to the Project HomePage!</h1>
${userId ? `
` : `<a href='/login'>Login</a>
<a href='/register'>Register</a>
`} 
<a href='/home'>Home</a>
<a href='/profile'>Profile</a>
<form method='post' action='/logout'>
<button>Logout</button>
</form>
`)
})

//get The Homepage
app.get('/home', redirectLogin, (req, res) => {
    const { user } = res.locals

    console.log(req.session.user)
    // inserted within res.send <a href='/userprofile'>User Profile</a>
    res.send(`
        <h1>Home</h1>
        <a href='/'>Main</a>
        <a href='/profile'>Profile</a>
        <ul>
            <li>Name:${user.name}</li>
            <li>Email: ${user.email}</li>
        </ul>
        <form method='get' action="/delete">
        <button>Delete account</button>
        </form>
    `)
})

//used to register
app.get('/register', redirectHome, (req, res) => {
    res.send(`<h1>Register</h1>
        <form method='post' action='/register'>
            <input type='name' name='name' placeholder='Name' required/>
            <input type='email' name='email' placeholder='Email' required/>
            <input type='password' name='password' placeholder='Password' required/>
            <input type='submit'/>
        </form>
        <a href='/login'>Login</a>
    `)
})


//used to login
app.get('/login', redirectHome, (req, res) => {
    res.send(`<h1>Login</h1>
        <form method='post' action='/login'>
            <input type='email' name='email' placeholder='Email' required/>
            <input type='password' name='password' placeholder='Password' required/>
            <input type='submit'/>
        </form>
        <a href='/register'>Register</a>
    `)
})

//GET the delete page
app.get('/delete', (req, res) => {
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.error(err);
            return;
        }
        var dbo = db.db(dbName);
        var currentuser = req.locals.user.id;
        dbo.collection('customers').deleteOne(currentuser, function (err, res) {
            if (err) {
                console.error(err);
                return;
            }
            console.log("Account deleted successfully");
            db.close();
        });
    })
    res.send(`Account deleted
<a href='/'>Main</a>
`)
})

//creating a user profile
app.get('/profile', redirectProfile, (req, res) => {
    const { user } = req.session;
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.error(err);
            return;
        }
        var dbo = db.db(dbName);
        dbo.collection('customers').findOne({ _id: user._id }, function (err, doc) {
            if (err || !doc) {
                console.error(err);
                return res.send(`
                    <h1>Profile</h1>
                    <form action='/uploadimage' method="POST" enctype="multipart/form-data">
                        <input type="file" id="file" name="file"/><br/><br/>
                        <input type='submit' value="Upload" />
                    </form>
            
                    <form action='/profiledata' method="POST">
                        <textarea id="description"  name="description" cols="30" rows="6"></textarea><br/><br/>
                        <input type='submit'/>
                    </form>
                    <a href='/home'>Home</a>
                `);
            }

            const html = `
                <h1>Profile</h1>
                <div>
                    <p>${doc.description}</p>
                </div>
                <div>
                    <form action='/profiledata/${user._id}' method="PUT">
                        <textarea id="description"  name="description" cols="30" rows="6"></textarea><br/><br/>
                        <input type="submit" value='Update'/>
                    </form>
                    <form action='/profiledata/${user._id}' method="DELETE">
                        <input type="submit" value='Delete'/>
                    </form>
                </div>
            `;
            res.send(html);
        });
    });
})

// GET the user profile
/*app.get('/userProfile', redirectUserProfile, (req, res) => {
    const user = req.session.files;
    console.log("userprofile ", req.session);


    res.send(`<h1>User Details</h1>
        <a href='/home'>Home</a>
        <form method='post' action='/userProfile'  enctype="multipart/form-data">
    <input type='text' name='name' placeholder="File Name.." /><br />
    <input type='file' name= 'uploadedFile' /> <br /> <br />
    <input type='submit' value='Upload File' /> 
       <input type="submit" value="Delete" />

</form>


        
    `)
})*/
app.set('view engine', 'ejs');

app.get('/userProfile', (req, res) => {

    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if (
                    file.contentType === 'image/jpeg' ||
                    file.contentType === 'image/png'
                ) {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            });
            res.render('index', { files: files });
        }
    });
});


//used to register
app.post('/register', redirectHome, (req, res) => {
    //Creation of the name, email and password html body
    const { name, email, password } = req.body
    if (name && email && password) {
        //find if the user exists
        const exists = users.some(
            user => user.email == email
        )
        if (!exists) {
            const user = {
                id: users.length + 1,
                name,
                email,
                password
            }
            MongoClient.connect(url, function (err, db) {
                if (err) {
                    console.error(err);
                    return;
                }
                var dbo = db.db(dbName);
                dbo.collection('customers').insertOne(user, function (err, res) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    console.log("Account inserted successfully");
                    db.close();
                });
            })
            //adds the user to the user collection
            users.push(user)
            req.session.userId = user.id
            //returns user to home page
            return res.redirect('/home')
            console.log(users);
        } //closing tag
    }
    //if validation fails
    res.redirect('/register')
})

//corresponding POSTS
app.post('/login', redirectUserProfile, (req, res) => {
    //Track the user password and email
    const { email, password } = req.body
    if (email && password) {
        //const user = users.find(
        //user => user.email == email && user.password === password
        //)
        //creating a session id cookie
        //if (user) {
        //req.session.userId = user.id;

        MongoClient.connect(url, function (err, db) {
            if (err) {
                console.error(err);
                return;
            }
            var dbo = db.db(dbName);
            var query = { email };
            dbo.collection('customers').findOne(query, function (err, result) {
                if (err) {
                    console.log("error", err);
                    return;
                }
                // console.log("login success", result)
                if (result.password == password) {
                    console.log("user", result);
                    req.session.user = result;
                    // res.redirect('/userprofile');
                } else {
                    req.session.user = null;
                }

                db.close();
                // return res.redirect('/home')
            });

        })

        //}
    }
    //if validation fails or cannot find user
    res.redirect('/userProfile')
    //req.session.userId=
})


//logout
app.post('/logout', redirectLogin, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/home')
        }
        //clears the cookie after logging out
        res.clearCookie(SESS_NAME)
        res.redirect('/login')
    })
})

//upload image
/*app.post('/uploadimage', upload.single('file'), (req, res) => {
    console.log('Upload successful!');
    res.redirect('/profile');
});*/


/*app.post('/profiledata', (req, res) => {
    const {description} = req.body;
    const {userId} = req.session;

    console.log(description);
    console.log(userId);

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db(dbName);
        dbo.collection('customers').findOneAndUpdate({id: userId}, {$set: {description}},
            {upsert: true},
            function (err, res) {
                if (err) throw err;
                console.log("Data updated successfully");
                db.close();
            });
    })
    res.redirect("/home");
});*/

/*app.post('/userProfile', (req, res) => {
    const { name, uploadedImage, storage } = req.body;


    //var x = {name: req.body.name, file: binary(req.file())};
    //var fileNames = req.files.imagefile;
    //insertFile(x,res);

    if (name && uploadedImage && storage) {
        //find if the user exists
        const exists = fileInfo.some(
            user => user.filename == filename
        )
        if (!exists) {
            const user = {
                filename: fileInfo.length+1,
                name,
                uploadedImage,
                storage
            }

            MongoClient.connect(url, function (err, db) {
                if (err) {
                    console.error(err);
                    throw err;
                }
                var dbo = db.db(dbName);
                var profileData = {uploadedImage, storage};
                dbo.collection('customers').findOne(user, function (err, res) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    //res.redirect("/userProfile");
                    console.log("Data added successfully");
                    db.close();

                });
                //adds the user to the user collection
                users.push(user)
                req.session.userId = user.filename
                //returns user to home page
                return res.redirect('/home')
                console.log(fileInfo);
            })
        }
    }
    res.redirect("/home");
});*/

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
    // res.json({ file: req.file });
    res.redirect('/userProfile');
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }

        // Files exist
        return res.json(files);
    });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }
        // File exists
        return res.json(file);
    });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }

        // Check if image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            });
        }
    });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json({ err: err });
        }

        res.redirect('/userProfile');
    });
});

/*app.put('/profiledata/:userId', (req, res) => {
    const { description } = req.body;
    const { userId } = req.params;

    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.error(err);
            throw err;
        }
        var dbo = db.db(dbName);
        var query = { _id: userId };
        var updateValues = { $set: { description } };
        dbo.collection('customers').updateOne(query, updateValues, function (err, res) {
            if (err) {
                console.error(err);
                throw err;
            }
            console.log("Data updated successfully");
            db.close();
        });
    })
    res.redirect("/home");
});

app.delete('/profiledata/:userId', (req, res) => {
    const { description } = req.body;
    const { userId } = req.params;

    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.error(err);
            throw err;
        }
        var dbo = db.db(dbName);
        var query = { _id: userId };
        var deleteValues = { $unset: { description } };
        dbo.collection('customers').updateOne(query, deleteValues, function (err, res) {
            if (err) {
                console.error(err);
                throw err;
            }
            console.log("Data deleted successfully");
            db.close();
        });
    })
    res.redirect("/home");
});
// used to insert the file
function insertFile(file,res){
    MongoClient.connect(url, {useNewUrlParser: true},(err,client)=>{
        if(err){
            return err
        }else{
            let db = client.db('uploadDB')
            let collection = db.collection('files')

            try{
                collection.insertOne(file);
                console.log('File has been inserted in DB')
            }catch(err){
                console.log('Error while inserting:', err)
            }
            client.close()
            res.redirect('/home')
        }
    })
}*/



//use localhost:8080
app.listen(PORT, () => console.log(`Example app listening on port ${PORT}`))
