<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/architect/assets.arc.codes/raw/main/public/architect-logo-light-500b%402x.png">
  <img alt="Architect Logo" width="500px" src="https://github.com/architect/assets.arc.codes/raw/main/public/architect-logo-500b%402x.png">
</picture>
</p>

## [`@architect/plugin-go`](https://www.npmjs.com/package/@architect/plugin-go)

> Go runtime + workflow integration for Architect

[![GitHub CI status](https://github.com/architect/plugin-go/workflows/Node%20CI/badge.svg)](https://github.com/architect/plugin-go/actions?query=workflow%3A%22Node+CI%22)


## Install

Into your existing Architect project:

```sh
npm i @architect/plugin-go --save-dev
```

Add the following to your Architect project manifest (usually `app.arc`):

```arc
@aws
runtime go # sets Go as the the default runtime for your entire project

@plugins
architect/plugin-go
```

Or, if you'd prefer to add a single Go Lambda to start, forego the above `runtime go` setting in your project manifest, and add the following to a single Lambda:

```arc
# src/http/get-index/config.arc
@aws
runtime go
```


## Usage

Now, simply author and port Lambdas in the `src` tree (with appropriate Cargo files). For example:

```go
// src/http/get-index/src/main.rs
#[macro_use]
extern crate json;
use json::{stringify};
use lambda_http::{run, service_fn, Body, Error, Request, Response};

#[tokio::main]
async fn main() -> Result<(), Error> {
  run(service_fn(function_handler)).await
}

async fn function_handler(_event: Request) -> Result<Response<Body>, Error> {
  let body = object!{
    ok: true,
  };
  let resp = Response::builder()
    .status(200)
    .header("content-type", "application/json")
    .body(stringify(body).into())
    .map_err(Box::new)?;
  Ok(resp)
}
```

The above function will be automatically compiled by Architect to `./.build/http/get-index/` with `cargo build` (for local development) and `cargo lambda build` (for final deployment to Lambda) commands. (The destination build directory is configurable, [see below](#configuration).)

When working locally, Sandbox automatically detects changes to your Go handlers and re-compiles them for you.


## Configuration

### Lambda architecture

By default, Architect Go uses the Lambda architecture available in all regions: `x86_64`. However, if your app is deployed in a region that supports `arm64`, we strongly suggest configuring that like so in your project manifest:

```arc
@aws
architecture arm64
```

> Caveat: due to the way Architect runtime plugins work under the hood, Architect Go only respects the project's global architecture setting. If your project includes non-go Lambdas that need to use a different architecture, their architecture should be [configured individually via `config.arc`](https://arc.codes/docs/en/reference/configuration/function-config#architecture).


### Project manifest settings

The following higher-level settings are also available in your Architect project manifest with the `@go` settings pragma:
- `build` - customize the build directory; defaults to `.build`
  - Note: make sure you add this directory to your `.gitignore`

Example:

```arc
@go
# Build into `./dist`
build dist
```


### Build output

`cargo` features fairly verbose output logging, which is disabled by default. To enable it, pass the CLI flag `--verbose|-v` or `--debug|-d`.
