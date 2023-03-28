package main

import (
	"errors"
	"github.com/aws/aws-lambda-go/lambda"
)

func hello() (string, error) {
	return "nah", errors.New("oh noes")
}

func main() {
	// Make the handler available for Remote Procedure Call by AWS Lambda
	lambda.Start(hello)
}
