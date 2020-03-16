
        import { Request, Response } from 'express';
  
        type Mutation =  {
  InsertUserAction: TokenOutput
}
type UserInfo =  {
  username: string
  password: string
}
type TokenOutput =  {
  accessToken: string
}
type InsertUserActionArgs =  {
  user_info: UserInfo
}
  
        function InsertUserAction(InsertUserActionArgs): TokenOutput {
  
        }
  
        // Request Handler
        const handler = async (req: Request, res: Response) => {
          // get request input
          const params: InsertUserActionArgs = req.body.input
  
          // run some business logic
          const result = InsertUserAction(params)
  
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
      