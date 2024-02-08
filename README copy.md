<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">

# Tracktime NestJS Authentication

This repository contains the NestJS application for user authentication and protected routes in the Tracktime project.

## Prerequisites

- Node.js installed
- NestJS framework
- Dependencies: @nestjs/jwt, passport, passport-jwt
- Access to Ory API for authentication services

## Getting Started

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set up environment variables for Ory API credentials and other configurations.
4. Start the NestJS application: `npm run start`.

## Usage

- POST /auth/register: Register a new user. Requires username, email, and password in the request body.
- POST /auth/login: Obtain an access token by providing email and password in the request body.
- GET /profile: Access user details. Requires a valid JWT token in the request header as Authorization: Bearer <token>.

## Contributing

Contributions are welcome! Please follow the guidelines in CONTRIBUTING.md.

## License

This project is licensed under the MIT License.

