const express = require("express");
const path = require("path");
const multer = require("multer");
const {
    body,
    validationResult
} = require("express-validator");

const app = express();
const PORT = 3000;

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --------------------
// Multer Configuration
// --------------------

const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/profile");
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    }
});

const otherStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/others");
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

// File type validation
const imageFilter = function (req, file, cb) {

    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, JPEG, PNG and GIF files are allowed."));
    }
};

// Profile picture - single file
const uploadProfile = multer({
    storage: profileStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
}).single("profilePic");

// Other pictures - multiple files
const uploadOthers = multer({
    storage: otherStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 5
    }
}).array("otherPics", 5);


// --------------------
// GET Registration Form
// --------------------

app.get("/", (req, res) => {

    res.render("form", {
        errors: [],
        values: {},
        hobbies: []
    });

});


// --------------------
// POST Registration
// --------------------

app.post(
    "/register",

    // First upload profile picture
    uploadProfile,

    // Then upload multiple pictures
    function (req, res, next) {

        uploadOthers(req, res, function (err) {

            if (err) {
                return res.render("form", {
                    errors: [
                        {
                            path: "files",
                            msg: err.message
                        }
                    ],
                    values: req.body || {},
                    hobbies: req.body.hobbies || []
                });
            }

            next();
        });

    },

    // Validation
    [
        body("username")
            .trim()
            .notEmpty()
            .withMessage("Username is required.")
            .isLength({ min: 3 })
            .withMessage("Username must contain at least 3 characters."),

        body("password")
            .notEmpty()
            .withMessage("Password is required.")
            .isLength({ min: 6 })
            .withMessage("Password must contain at least 6 characters."),

        body("confirmPassword")
            .notEmpty()
            .withMessage("Please confirm your password.")
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error("Passwords do not match.");
                }

                return true;
            }),

        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required.")
            .isEmail()
            .withMessage("Please enter a valid email address."),

        body("gender")
            .notEmpty()
            .withMessage("Please select your gender."),

        body("hobbies")
            .custom((value) => {

                if (!value) {
                    throw new Error("Please select at least one hobby.");
                }

                return true;
            })
    ],

    // Handle validation result
    (req, res) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            return res.render("form", {
                errors: errors.array(),
                values: req.body,
                hobbies: Array.isArray(req.body.hobbies)
                    ? req.body.hobbies
                    : req.body.hobbies
                        ? [req.body.hobbies]
                        : []
            });

        }

        // --------------------
        // Successful submission
        // --------------------

        res.render("result", {

            user: req.body,

            profilePic: req.file,

            otherPics: req.files || []

        });

    }
);


// --------------------
// Download Route
// --------------------

app.get("/download/:folder/:filename", (req, res) => {

    const folder = req.params.folder;
    const filename = req.params.filename;

    const allowedFolders = ["profile", "others"];

    if (!allowedFolders.includes(folder)) {
        return res.status(400).send("Invalid folder.");
    }

    const filePath = path.join(
        __dirname,
        "uploads",
        folder,
        filename
    );

    res.download(filePath, filename, (err) => {

        if (err) {
            console.log(err);
        }

    });

});


// --------------------
// Start Server
// --------------------

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});