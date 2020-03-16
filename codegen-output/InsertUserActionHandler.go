package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type Mutation struct {
	InsertUserAction TokenOutput
}
type UserInfo struct {
	username string
	password string
}
type TokenOutput struct {
	accessToken string
}
type InsertUserActionArgs struct {
	user_info UserInfo
}

func handler(w http.ResponseWriter, r *http.Request) {
	// Declare a new struct for unmarshalling the arguments
	var actionParams InsertUserActionArgs

	// Try to decode the request body into the struct. If there is an error,
	// respond to the client with the error message and a 400 status code.
	err := json.NewDecoder(r.Body).Decode(&actionParams)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Send the request params to the Action's generated handler function
	result := InsertUserAction(actionParams)
	data, err := json.Marshal(result)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Write the response as JSON
	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// Auto-generated function that takes the Action parameters and must return it's response type
func InsertUserAction(InsertUserActionArgs) TokenOutput {

}

// HTTP server for the handler
func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/InsertUserAction", handler)

	err := http.ListenAndServe(":8080", mux)
	log.Fatal(err)
}
