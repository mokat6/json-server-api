# JSONServer + JWT Auth

A Fake REST API using json-server with JWT authentication.

Implemented End-points: login,register

## Install

Node 18/20 

```bash
$ npm install
```

Dependency imports/resolving doesn't work with json-server v1.0 +
so I'm using ^0.x

---

## Run

```bash
node server.js
```

or

```bash
npx json-server --watch database.json --port 3000
```

## How to login/register?

You can login/register by sending a POST request to

```
POST http://localhost:8000/auth/login
POST http://localhost:8000/auth/register
```

with the following data

```
{
  "email": "nilson@email.com",
  "password":"nilson"
}
```

You should receive an access token with the following format

```
{
   "access_token": "<ACCESS_TOKEN>"
}
```

You should send this authorization with any request to the protected endpoints

```
Authorization: Bearer <ACCESS_TOKEN>
```
