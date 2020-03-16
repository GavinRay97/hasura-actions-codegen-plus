import { TSTypeConverter, GoTypeConverter } from './typeConverter'

const schemaSource = `
  type Mutation {
    InsertUserAction(user_info: UserInfo, something_else: [Int!]): TokenOutput
  }

  input UserInfo {
    username: String!
    password: [String]
    something_else: [Float!]
  }

  type TokenOutput {
    accessToken: String!
  }
`

const templater = (actionName, actionsSdl, derive) => {
  const tsTypeConverter = new TSTypeConverter({
    schema: actionsSdl,
    actionCodegen: (actionName, actionType, args, schemaTypes) => {
      console.log(actionName, actionType, args, schemaTypes)
      const handler = `
        import { Request, Response } from 'express';
  
        ${schemaTypes}
  
        function ${actionName}(${actionName}Args): ${actionType} {
  
        }
  
        // Request Handler
        const handler = async (req: Request, res: Response) => {
          // get request input
          const params: ${actionName}Args = req.body.input
  
          // run some business logic
          const result = ${actionName}(params)
  
          /*
          // In case of errors:
          return res.status(400).json({
            message: "error happened"
          })
          */
  
          // success
          return res.json(result)
        }
  
        module.exports = handler
      `

      console.log(handler)
      return handler
    }
  })

  const goTypeConverter = new GoTypeConverter({
    schema: actionsSdl,
    actionCodegen: (actionName, actionType, actionArgs, schemaTypes) => {
      const handler = `
        package main
  
        import (
          "encoding/json"
          "log"
          "net/http"
        )      
  
        ${schemaTypes}
  
        func handler(w http.ResponseWriter, r *http.Request) {
          // Declare a new struct for unmarshalling the arguments
          var actionParams ${actionName}Args
  
          // Try to decode the request body into the struct. If there is an error,
          // respond to the client with the error message and a 400 status code.    
          err := json.NewDecoder(r.Body).Decode(&actionParams)
          if err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
          }
          
          // Send the request params to the Action's generated handler function
          result := ${actionName}(actionParams)
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
        func ${actionName}(${actionName}Args) ${actionType} {
  
        }
  
        // HTTP server for the handler
        func main() {
          mux := http.NewServeMux()
          mux.HandleFunc("/${actionName}", handler)
      
          err := http.ListenAndServe(":8080", mux)
          log.Fatal(err)
        }`
      return handler
    }
  })

  const response = [
    {
      name: actionName + 'Handler.ts',
      content: tsTypeConverter.getActionCode(actionName)
    },
    {
      name: actionName + 'Handler.go',
      content: goTypeConverter.getActionCode(actionName)
    }
  ]
  return response
}

globalThis.templater = templater
