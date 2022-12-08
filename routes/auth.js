const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'sectr';
const fetchuser = require('../middleware/fetchuser');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const dotenv = require('dotenv')
dotenv.config({ path: './process.env' })
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
// const { json } = require('express');

// router.get('/',(req,res)=>{
//     console.log(req.body);
//     res.json([])
// })

var resetPasswordToken = "";
var resetPasswordExpires = "";

router.post('/createuser', [
    body('name', 'Enter Valid Name').isLength({ min: 3 }),
    body('email', 'enter valid email').isEmail(),
    body('password', 'password should be min 5char long').isLength({ min: 5 })
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // return res.status(404).json({ errors: errors.array() });
        return res.status(404).json({ success: false, errors });
    }
    try {

        let email = await User.findOne({ email: req.body.email })

        if (!email) {
            const salt = await bcrypt.genSalt(10);
            const securePass = await bcrypt.hash(req.body.password, salt);
            const user = await User.create({ name: req.body.name, email: req.body.email, password: securePass });

            const authToken = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
            // console.log(authToken);


            res.json({ success: true, authToken });
            // .then(user => res.json(user)).catch(err => res.json({ message: err.message }));
        }
        else {
            res.json({ success: false, error: 'enter unique email' });
        }
    } catch (error) {

        res.status(500).json({ success: false, error });
        console.error(error.message);

    }
})

router.post('/login', [
    body('email', 'enter valid email').isEmail(),
    body('password', '*required').exists()
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(404).json({ success: false, errors });
    }
    try {
        const { email, password } = req.body;
        // const user=await User.findOne({email:email});
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, error: 'enter valid credentials' });
        }

        const passCompare = await bcrypt.compare(password, user.password);
        if (!passCompare) {
            return res.status(400).json({ success: false, error: 'enter valid credentials' });
        }
        const authToken = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
        res.json({ success: true, authToken });


    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error: 'internal server error' });
    }

})

router.post('/verify', async (req, res) => {

    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     return res.status(404).json({success:false,errors});
    // }
    try {
        const { email,vcode } = req.body;
        // const user=await User.findOne({email:email});
        const user = await User.findOne({ email });

        if (!vcode) {
            return res.status(400).json({ success: false, error: 'enter valid credentials' });
        }
        if (Date.now() <= resetPasswordExpires) {

            return res.status(400).json({ success: false, error: 'enter valid credentials' });
        }
        const passCompare = vcode === resetPasswordToken
        if (!passCompare) {
            return res.status(400).json({success:false, error: 'enter valid credentials' });
        }

        const authToken = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
        res.json({ success: true, authToken });


    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error: 'internal server error' });
    }

})

router.post('/forget', [
    body('email', 'enter valid email').isEmail(),
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(404).json({ success: false, errors });
    }
    try {
        const { email } = req.body;
        // const user=await User.findOne({email:email});
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Enter valid credentials' });
        }

        // const passCompare = await bcrypt.compare(password, user.password);
        // if (!passCompare) {
        //     return res.status(400).json({success:false, error: 'Enter valid credentials' });
        // }

        // const authToken = jwt.sign({ user: { id: user.id } }, JWT_SECRET);

        resetPasswordToken = crypto.randomBytes(20).toString('hex');
        resetPasswordExpires = Date.now() + 600000; //expires in 10 mins
        // console.log(resetPasswordToken);

        // let link = "http://" + req.headers.host + "/api/auth/reset/" + user.resetPasswordToken;
        const mailOptions = {
            to: user.email,
            from: "klm71411@nezid.com",
            subject: "Password change request",
            text: `Hi ${user.name} \n 
        Please verify this code ${resetPasswordToken} to reset your password. \n\n 
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };

        sgMail.send(mailOptions, (error, result) => {
            // if (error) return res.status(500).json({ message: error });
            console.log(result)
            console.log(error)
            // res.status(200).json({success:true, message: 'A reset email has been sent to ' + user.email + '.' });
        })

        res.json({ success: true });


    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error: 'internal server error' });
    }

})

router.post('/getuser', fetchuser, async (req, res) => {

    try {
        const user = await User.findById(req.user.id).select('-password');

        res.json(user);

    } catch (error) {
        res.status(500).json({ error: 'internal server error' });
        console.log(error);

    }
})



module.exports = router;