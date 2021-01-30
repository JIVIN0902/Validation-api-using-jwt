const express = require('express')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const path = require('path')
const app = express()
const bcrypt = require('bcrypt')
const User = require('./model/user')
const mongoose = require('mongoose')
const joi = require('joi')
require('dotenv').config()

const registerSchema = joi.object({
	username: joi.string()
				.min(6)
				.required(),
	password: joi.string()
				.min(6)
				.required(true)
})

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })

const db = mongoose.connection

db.on('open', () => console.log('connected to database'))
db.on('error', (error) => console.log(error))

app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.post('/api/register', async (req,res) => {
	let { error } = registerSchema.validate(req.body)
	
	if (error){
		return res.json({ status: 'error', error: error.details[0].message })
	}
	const { username, password : plainTextPassword } = req.body

	if (!username || typeof username !== 'string') {
		return res.json({ status:'error', error: 'Invalid username' })
	}

	if (!plainTextPassword || typeof plainTextPassword !== 'string') {
		return res.json({ status:'error', error: 'Invalid password' })
	}

	if (plainTextPassword.length < 5) {
		return res.json({ status:'error', error: 'Password too small' })
	}

	const password = await bcrypt.hash(plainTextPassword, 10)

	try{
		const res = await User.create({
			username,
			password
		})

		console.log(res)
		console.log('user created')
	}
	catch (error){
		console.log(error)
		return res.json({ status: 'error', error: 'Error' })
	}
	res.json({ status: 'ok' })

})


app.post('/api/login', async (req,res) => {
	const { username, password } = req.body

	try{
		const user = await User.findOne({
			username: username
		})
		.select('username password')
		.exec()

		if (!user) {
			return res.json({ status: 'error', error: 'Invalid username/password' })
		}

		const token = jwt.sign({
			id: user._id,
			username: user.username
		}, process.env.JWT_SECRET)

		res.json({ status: 'ok', data: token})
	}
	catch (error) {
		res.json({ status: 'error', error: 'An unknown error occured'})
	}
})

app.post('/api/change-password', async (req,res) => {
	const { newPassword: plainTextPassword, token } = req.body
	
	if (!plainTextPassword || typeof plainTextPassword !== 'string') {
		return res.json({ status:'error', error: 'Invalid password' })
	}

	if (plainTextPassword.length < 5) {
		return res.json({ status:'error', error: 'Password too small' })
	}

	const user = jwt.verify(token, process.env.JWT_SECRET)

	const id = user._id

	const hashedPassword = await bcrypt.hash(plainTextPassword, 10)
	try{
		await User.updateOne(
			{id},
			{
				$set: {password: hashedPassword}
			}
		)
		res.json({ status: 'ok' })
	}
	catch (err){
		res.json({ status: 'error', error: 'unknown error occured' })
	}

})

app.listen(3000, () => console.log('listening on port 3000'))