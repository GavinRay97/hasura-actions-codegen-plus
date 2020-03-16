cd hasura
./hasura-cli migrate apply
./hasura-cli metadata apply
./hasura-cli actions codegen InsertUserAction
