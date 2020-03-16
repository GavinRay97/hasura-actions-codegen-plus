import {
  t,
  documentApi,
  FieldDefinitionApi,
  TypeMap,
  DocumentApi,
  isObjectTypeDefinitionNode,
  getName
} from 'graphql-extra'

// interface TypeMap {
//   [key: string]: TypeMapEntry
// }

// interface TypeMapEntry {
//   fields: Field[]
// }

interface Field {
  name: string
  type: string
  required: boolean
  list: boolean
  args: Field[]
}

// If the field has arguments in it, extract their information as well
const extractArgInfo = (field) =>
  'getArguments' in field ? field.getArguments().map(extractInfo) : []

// TODO: Move into TypeConverter and convert the type before saving
// Recursively extract type and argument info
const extractInfo = (field) => ({
  name: field.getName(),
  type: field.getTypename(),
  required: field.isNonNullType(),
  list: field.isListType(),
  // Recursion here
  args: extractArgInfo(field)
})

/**
 * An Enum for GraphQL scalars
 * Used to compose ScalarMaps for language-specific types codegen
 */
enum ScalarTypes {
  ID = 'ID',
  INT = 'Int',
  FLOAT = 'Float',
  STRING = 'String',
  BOOLEAN = 'Boolean'
}

enum Languages {
  TYPESCRIPT = 'Typescript'
}

const scalarMap = {
  [ScalarTypes.INT]: {
    [Languages.TYPESCRIPT]: `number`
  },
  [ScalarTypes.FLOAT]: {
    [Languages.TYPESCRIPT]: `number`
  },
  [ScalarTypes.STRING]: {
    [Languages.TYPESCRIPT]: `string`
  },
  [ScalarTypes.BOOLEAN]: {
    [Languages.TYPESCRIPT]: `boolean`
  }
}

/**
 * An interface that TypeConverters must implement for how to
 * map GraphQL scalars to their corresponding language types
 */
type ScalarMap = {
  [key in ScalarTypes]: string
}

interface BaseTypeConverterConfig {
  schema: string
  scalarMap: ScalarMap
  // What the identifier for a type is called in the language
  typeClassIdentifier: (type: string) => string
  // How to format individual fields of a type in a class/struct/interface
  fieldFormatter: (
    name: string,
    type: string,
    list: boolean,
    nullable: boolean
  ) => string
  actionCodegen: (
    actionName: string,
    actionType: string,
    actionArgs: Field[],
    schemaTypes: string
  ) => string
}

function addFieldInfoToTypeMap(document: DocumentApi) {
  let newMap = new Map(document.typeMap)
  for (let [type, node] of newMap) {
    const typeApi = document.getType(type)
    // const nodeApi = astKindToApi(node.kind)(node as any)
    // console.log(nodeApi)
    if ('getFields' in typeApi) {
      const fields = typeApi.getFields()
      const fieldInfo = (fields as any).map(extractInfo)
      const withFieldInfo = { ...node, fieldInfo }
      newMap.set(type, withFieldInfo)
    }
  }
  return newMap
}

class TypeConverter {
  public config: BaseTypeConverterConfig
  public typeMap: TypeMap
  public document: DocumentApi

  constructor(config: BaseTypeConverterConfig) {
    let document = documentApi().addSDL(config.schema)
    this.config = config
    this.document = document
    this.addActionArgumentTypesToSchema()
    this.addFieldInfoToTypeMap()
  }

  addFieldInfoToTypeMap() {
    for (let [type, node] of this.document.typeMap) {
      const typeApi = this.document.getType(type)
      // const nodeApi = astKindToApi(node.kind)(node as any)
      // console.log(nodeApi)
      if ('getFields' in typeApi) {
        const fields = typeApi.getFields()
        const fieldInfo = (fields as any).map(extractInfo)
        const withFieldInfo = { ...node, fieldInfo }
        this.document.typeMap.set(type, withFieldInfo)
      }
    }
  }

  makeActionArgType(field: FieldDefinitionApi) {
    const node = t.objectType({
      name: field.getName() + 'Args',
      fields: field.getArguments().map((arg) => arg.node)
    })
    return node
  }

  addActionArgumentTypesToSchema() {
    const mutation = this.document.getObjectType('Mutation')
    mutation.getFields().forEach((field) => {
      const actionArgType = this.makeActionArgType(field) as any
      this.document.createObjectType(actionArgType)
    })
  }

  findAction(actionName: string): Field {
    const mutation = this.document.typeMap.get('Mutation') as any
    const action = mutation.fieldInfo.find((field) => field.name == actionName)
    return action
  }

  getActionCode(action: string) {
    const { name, type, args } = this.findAction(action)
    const parsedArgs = args.map((arg) => this.convertField(arg))
    const typeDefs = this.typeMapToLanguageTypeDefs()
    return this.config.actionCodegen(name, type, parsedArgs, typeDefs)
  }

  /**
   * Converts a TypeMap object to language-specific Type definitions
   * using the TypeConverter for the language provided
   * @param typeMap
   * @param typeConverter
   */
  typeMapToLanguageTypeDefs() {
    let typeDefs = []
    const { typeClassIdentifier } = this.config
    for (let [type, entry] of this.document.typeMap) {
      console.log(type, entry)
      const typeName = typeClassIdentifier(type)
      const fieldTypes = this.getEntryFieldTypes(entry)
      const definition = `${typeName} {` + NEWLINE + fieldTypes + NEWLINE + `}`
      typeDefs.push(definition)
    }
    return typeDefs.join(NEWLINE)
  }

  getEntryFieldTypes(entry) {
    return entry.fieldInfo
      .map((field) => this.makeFieldType(field))
      .join(NEWLINE)
  }

  convertField(field: Field) {
    const convertedType = this.convertType(field.type)
    field.type = convertedType
    return field
  }

  convertType(type: string): string {
    const { scalarMap } = this.config
    const convertedType = isScalar(type) ? scalarMap[type] : type
    return convertedType
  }
  /**
   *
   * @param field
   */
  makeFieldType(field: Field) {
    const { fieldFormatter } = this.config
    const { type, name, list, required } = field
    const nullable = !required
    const convertedType = this.convertType(type)
    return indent(fieldFormatter(name, convertedType, list, nullable))
  }
}

// const kotlinScalarMap = {
//   [ScalarTypes.ID]: `Int`,
//   [ScalarTypes.INT]: `Int`,
//   [ScalarTypes.FLOAT]: `Float`,
//   [ScalarTypes.STRING]: `String`,
//   [ScalarTypes.BOOLEAN]: `Boolean`
// }

// const KotlinTypeConverter = new TypeConverter({
//   schema: schemaSource,
//   scalarMap: kotlinScalarMap,
//   typeClassIdentifier: (name) => `interface ${name}`,
//   fieldFormatter: (name, type, list, nullable) => {
//     // String -> String?
//     if (nullable) type += `?`
//     // String? -> List<String?>
//     if (list) type = `List<${type}>`
//     // var usernames: List<String?>
//     return `var ${name}: ${type}`
//   }
// })

const NEWLINE = '\n'
const SPACE = ' '

// Checks if type string exists in ScalarMap
const isScalar = (type: string) => scalarMap[type] != undefined
const indent = (string, tabSize = 2) => SPACE.repeat(tabSize) + string

interface LanguageTypeConverterConfig {
  schema: string
  actionCodegen: (
    actionName: string,
    actionType: string,
    actionArgs: Field[],
    schemaTypes: string
  ) => string
}

class TSTypeConverter extends TypeConverter {
  /**
   *
   */

  constructor(config: LanguageTypeConverterConfig) {
    const scalarMap = {
      [ScalarTypes.ID]: `number`,
      [ScalarTypes.INT]: `number`,
      [ScalarTypes.FLOAT]: `number`,
      [ScalarTypes.STRING]: `string`,
      [ScalarTypes.BOOLEAN]: `boolean`
    }
    const baseConfig = {
      scalarMap,
      typeClassIdentifier: (name) => `type ${name} = `,
      fieldFormatter: (name, type, list, nullable) => {
        if (list) type = `${type}[]`
        return `${name}: ${type}`
      }
    }
    super({ ...baseConfig, ...config })
  }
}

class GoTypeConverter extends TypeConverter {
  /**
   *
   */
  constructor(config: LanguageTypeConverterConfig) {
    const goLangScalarMap = {
      [ScalarTypes.ID]: `int`,
      [ScalarTypes.INT]: `int`,
      [ScalarTypes.FLOAT]: `float32`,
      [ScalarTypes.STRING]: `string`,
      [ScalarTypes.BOOLEAN]: `bool`
    }

    const baseConfig = {
      schema: config.schema,
      scalarMap: goLangScalarMap,
      typeClassIdentifier: (name) => `type ${name} struct`,
      fieldFormatter: (name, type, list, nullable) => {
        if (list) type = `[]${type}`
        return `${name} ${type}`
      }
    }
    super({ ...baseConfig, ...config })
  }
}
export { TypeConverter, TSTypeConverter, GoTypeConverter }
