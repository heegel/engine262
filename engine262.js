/*!
 * engine262 0.0.1 3ab56d870e4f065bb0a20d75cd4a4a780d9fc799
 *
 * Copyright (c) 2018 engine262 Contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['@engine262/engine262'] = {}));
}(this, (function (exports) { 'use strict';

  const kInternal = Symbol('kInternal');

  function convertValueForKey(key) {
    if (typeof key === 'string') {
      return Symbol.for(`engine262_helper_key_${key}`);
    }

    switch (Type(key)) {
      case 'String':
        return key.stringValue();

      case 'Number':
        return key.numberValue();

      default:
        return key;
    }
  }

  class ValueMap {
    constructor() {
      this.map = new Map();
    }

    get size() {
      return this.map.size;
    }

    get(key) {
      return this.map.get(convertValueForKey(key));
    }

    set(key, value) {
      this.map.set(convertValueForKey(key), value);
      return this;
    }

    has(key) {
      return this.map.has(convertValueForKey(key));
    }

    delete(key) {
      return this.map.delete(convertValueForKey(key));
    }

    *keys() {
      for (const [key] of this.entries()) {
        yield key;
      }
    }

    entries() {
      return this[Symbol.iterator]();
    }

    forEach(cb) {
      for (const [key, value] of this.entries()) {
        cb(value, key, this);
      }
    }

    *[Symbol.iterator]() {
      for (const [key, value] of this.map.entries()) {
        if (typeof key === 'string' || typeof key === 'number') {
          yield [new Value(key), value];
        } else {
          yield [key, value];
        }
      }
    }

    mark(m) {
      for (const [k, v] of this.entries()) {
        m(k);
        m(v);
      }
    }

  }
  class ValueSet {
    constructor(init) {
      this.set = new Set();

      if (init !== undefined && init !== null) {
        for (const item of init) {
          this.add(item);
        }
      }
    }

    get size() {
      return this.set.size;
    }

    add(item) {
      this.set.add(convertValueForKey(item));
      return this;
    }

    has(item) {
      return this.set.has(convertValueForKey(item));
    }

    delete(item) {
      return this.set.delete(convertValueForKey(item));
    }

    values() {
      return this[Symbol.iterator]();
    }

    *[Symbol.iterator]() {
      for (const key of this.set.values()) {
        if (typeof key === 'string' || typeof key === 'number') {
          yield new Value(key);
        } else {
          yield key;
        }
      }
    }

    mark(m) {
      for (const v of this.values()) {
        m(v);
      }
    }

  }
  class OutOfRange extends RangeError {
    /* istanbul ignore next */
    constructor(fn, detail) {
      super(`${fn}() argument out of range`);
      this.detail = detail;
    }

  }
  function unwind(iterator, maxSteps = 1) {
    let steps = 0;

    while (true) {
      const {
        done,
        value
      } = iterator.next('Unwind');

      if (done) {
        return value;
      }
      /* istanbul ignore next */


      steps += 1;

      if (steps > maxSteps) {
        throw new RangeError('Max steps exceeded');
      }
    }
  }
  const kSafeToResume = Symbol('kSameToResume');
  function handleInResume(fn, ...args) {
    const bound = () => fn(...args);

    bound[kSafeToResume] = true;
    return bound;
  }
  function resume(context, completion) {
    const {
      value
    } = context.codeEvaluationState.next(completion);

    if (typeof value === 'function' && value[kSafeToResume] === true) {
      let _temp = value();

      Assert(!(_temp instanceof AbruptCompletion), "value()" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      return _temp;
    }

    return value;
  }
  class CallSite {
    constructor(context) {
      this.context = context;
      this.lastNode = null;
      this.constructCall = false;
    }

    clone(context = this.context) {
      const c = new CallSite(context);
      c.lastNode = this.lastNode;
      c.constructCall = this.constructCall;
      return c;
    }

    isTopLevel() {
      return this.context.Function === Value.null;
    }

    isConstructCall() {
      return this.constructCall;
    }

    isAsync() {
      if (this.context.Function !== Value.null && this.context.Function.ECMAScriptCode) {
        const code = this.context.Function.ECMAScriptCode;
        return code.type === 'AsyncFunctionBody' || code.type === 'AsyncGeneratorBody';
      }

      return false;
    }

    isNative() {
      return !!this.context.Function.nativeFunction;
    }

    getFunctionName() {
      if (this.context.Function !== Value.null) {
        const name = this.context.Function.properties.get(new Value('name'));

        if (name) {
          let _temp2 = ToString(name.Value);

          Assert(!(_temp2 instanceof AbruptCompletion), "ToString(name.Value)" + ' returned an abrupt completion');

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }

          return _temp2.stringValue();
        }
      }

      return null;
    }

    getSpecifier() {
      if (this.context.ScriptOrModule !== Value.null) {
        return this.context.ScriptOrModule.HostDefined.specifier;
      }

      return null;
    }

    setLocation(node) {
      this.lastNode = node;
    }

    get lineNumber() {
      if (this.lastNode) {
        return this.lastNode.location.start.line;
      }

      return null;
    }

    get columnNumber() {
      if (this.lastNode) {
        return this.lastNode.location.start.column;
      }

      return null;
    }

    loc() {
      if (this.isNative()) {
        return 'native';
      }

      let out = '';
      const specifier = this.getSpecifier();

      if (specifier) {
        out += specifier;
      } else {
        out += '<anonymous>';
      }

      if (this.lineNumber !== null) {
        out += `:${this.lineNumber}`;

        if (this.columnNumber !== null) {
          out += `:${this.columnNumber}`;
        }
      }

      return out.trim();
    }

    toString() {
      const isAsync = this.isAsync();
      const functionName = this.getFunctionName();
      const isConstructCall = this.isConstructCall();
      const isMethodCall = !isConstructCall && !this.isTopLevel();
      let string = isAsync ? 'async ' : '';

      if (isConstructCall) {
        string += 'new ';
      }

      if (isMethodCall || isConstructCall) {
        if (functionName) {
          string += functionName;
        } else {
          string += '<anonymous>';
        }
      } else if (functionName) {
        string += functionName;
      } else {
        return `${string}${this.loc()}`;
      }

      return `${string} (${this.loc()})`;
    }

  }

  function captureAsyncStack(stack) {
    let promise = stack[0].context.promiseCapability.Promise;

    for (let i = 0; i < 10; i += 1) {
      if (promise.PromiseFulfillReactions.length !== 1) {
        return;
      }

      const [reaction] = promise.PromiseFulfillReactions;

      if (reaction.Handler && reaction.Handler.Callback.nativeFunction === AwaitFulfilledFunctions) {
        const asyncContext = reaction.Handler.Callback.AsyncContext;
        stack.push(asyncContext.callSite.clone());

        if ('PromiseState' in asyncContext.promiseCapability.Promise) {
          promise = asyncContext.promiseCapability.Promise;
        } else {
          return;
        }
      } else if (reaction.Capability !== Value.undefined) {
        if ('PromiseState' in reaction.Capability.Promise) {
          promise = reaction.Capability.Promise;
        } else {
          return;
        }
      }
    }
  }

  function captureStack(O) {
    const stack = [];

    for (let i = exports.surroundingAgent.executionContextStack.length - 2; i >= 0; i -= 1) {
      const e = exports.surroundingAgent.executionContextStack[i];

      if (e.VariableEnvironment === undefined && e.Function === Value.null) {
        break;
      }

      stack.push(e.callSite.clone());

      if (e.callSite.isAsync()) {
        i -= 1; // skip original execution context which has no useful information.
      }
    }

    if (stack.length > 0 && stack[0].context.promiseCapability) {
      captureAsyncStack(stack);
    }

    let cache = null;

    let _temp3 = DefinePropertyOrThrow(O, new Value('stack'), Descriptor({
      Get: CreateBuiltinFunction(() => {
        if (cache === null) {
          let _temp4 = ToString(O);

          Assert(!(_temp4 instanceof AbruptCompletion), "ToString(O)" + ' returned an abrupt completion');

          if (_temp4 instanceof Completion) {
            _temp4 = _temp4.Value;
          }

          let errorString = _temp4.stringValue();

          stack.forEach(s => {
            errorString = `${errorString}\n    at ${s.toString()}`;
          });
          cache = new Value(errorString);
        }

        return cache;
      }, []),
      Set: CreateBuiltinFunction(([value = Value.undefined]) => {
        cache = value;
        return Value.undefined;
      }, []),
      Enumerable: Value.false,
      Configurable: Value.true
    }));

    Assert(!(_temp3 instanceof AbruptCompletion), "DefinePropertyOrThrow(O, new Value('stack'), Descriptor({\n    Get: CreateBuiltinFunction(() => {\n      if (cache === null) {\n        let errorString = X(ToString(O)).stringValue();\n        stack.forEach((s) => {\n          errorString = `${errorString}\\n    at ${s.toString()}`;\n        });\n        cache = new Value(errorString);\n      }\n      return cache;\n    }, []),\n    Set: CreateBuiltinFunction(([value = Value.undefined]) => {\n      cache = value;\n      return Value.undefined;\n    }, []),\n    Enumerable: Value.false,\n    Configurable: Value.true,\n  }))" + ' returned an abrupt completion');

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }
  }

  function StringValue(node) {
    switch (node.type) {
      case 'Identifier':
      case 'IdentifierName':
      case 'BindingIdentifier':
      case 'IdentifierReference':
      case 'LabelIdentifier':
        return new Value(node.name);

      case 'StringLiteral':
        return new Value(node.value);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('StringValue', node);
    }
  }

  // #sec-static-semantics-isstatic
  // ClassElement :
  //   MethodDefinition
  //   `static` MethodDefinition
  //   `;`
  function IsStatic(ClassElement) {
    return ClassElement.static;
  }

  // ClassElementList :
  //   ClassElement
  //   ClassElementList ClassElement

  function NonConstructorMethodDefinitions(ClassElementList) {
    return ClassElementList.filter(ClassElement => {
      if (ClassElement.static === false && PropName(ClassElement) === 'constructor') {
        return false;
      }

      return true;
    });
  }

  // ClassElementList :
  //   ClassElement
  //   ClassElementList ClassElement

  function ConstructorMethod(ClassElementList) {
    return ClassElementList.find(ClassElement => ClassElement.static === false && PropName(ClassElement) === 'constructor');
  }

  function PropName(node) {
    switch (node.type) {
      case 'IdentifierName':
        return node.name;

      case 'StringLiteral':
        return node.value;

      case 'MethodDefinition':
      case 'GeneratorMethod':
      case 'AsyncGeneratorMethod':
      case 'AsyncMethod':
        return PropName(node.PropertyName);

      case 'ClassElement':
        if (node.MethodDefinition) {
          return PropName(node.MethodDefinition);
        }

        return undefined;

      default:
        return undefined;
    }
  }

  // #sec-numericvalue
  function NumericValue(node) {
    return new Value(node.value);
  }

  function IsAnonymousFunctionDefinition(expr) {
    // 1. If IsFunctionDefinition of expr is false, return false.
    if (!IsFunctionDefinition(expr)) {
      return false;
    } // 1. Let hasName be HasName of expr.


    const hasName = HasName(expr); // 1. If hasName is true, return false.

    if (hasName) {
      return false;
    } // 1. Return true.


    return true;
  }

  function IsFunctionDefinition(node) {
    if (node.type === 'ParenthesizedExpression') {
      return IsFunctionDefinition(node.Expression);
    }

    return node.type === 'FunctionExpression' || node.type === 'GeneratorExpression' || node.type === 'AsyncGeneratorExpression' || node.type === 'AsyncFunctionExpression' || node.type === 'ClassExpression' || node.type === 'ArrowFunction' || node.type === 'AsyncArrowFunction';
  }

  function HasName(node) {
    if (node.type === 'ParenthesizedExpression') {
      return HasName(node.Expression);
    }

    return !!node.BindingIdentifier;
  }

  function IsIdentifierRef(node) {
    return node.type === 'IdentifierReference';
  }

  function LexicallyDeclaredNames(node) {
    switch (node.type) {
      case 'Script':
        if (node.ScriptBody) {
          return LexicallyDeclaredNames(node.ScriptBody);
        }

        return [];

      case 'ScriptBody':
        return TopLevelLexicallyDeclaredNames(node.StatementList);

      case 'FunctionBody':
      case 'GeneratorBody':
      case 'AsyncFunctionBody':
      case 'AsyncGeneratorBody':
        return TopLevelLexicallyDeclaredNames(node.FunctionStatementList);

      default:
        return [];
    }
  }

  function TopLevelLexicallyDeclaredNames(node) {
    if (Array.isArray(node)) {
      const names = [];

      for (const StatementListItem of node) {
        names.push(...TopLevelLexicallyDeclaredNames(StatementListItem));
      }

      return names;
    }

    switch (node.type) {
      case 'ClassDeclaration':
      case 'LexicalDeclaration':
        return BoundNames(node);

      default:
        return [];
    }
  }

  function BoundNames(node) {
    if (Array.isArray(node)) {
      const names = [];

      for (const item of node) {
        names.push(...BoundNames(item));
      }

      return names;
    }

    switch (node.type) {
      case 'BindingIdentifier':
        return [StringValue(node)];

      case 'LexicalDeclaration':
        return BoundNames(node.BindingList);

      case 'LexicalBinding':
        if (node.BindingIdentifier) {
          return BoundNames(node.BindingIdentifier);
        }

        return BoundNames(node.BindingPattern);

      case 'VariableStatement':
        return BoundNames(node.VariableDeclarationList);

      case 'VariableDeclaration':
        if (node.BindingIdentifier) {
          return BoundNames(node.BindingIdentifier);
        }

        return BoundNames(node.BindingPattern);

      case 'ForDeclaration':
        return BoundNames(node.ForBinding);

      case 'ForBinding':
        if (node.BindingIdentifier) {
          return BoundNames(node.BindingIdentifier);
        }

        return BoundNames(node.BindingPattern);

      case 'FunctionDeclaration':
      case 'GeneratorDeclaration':
      case 'AsyncFunctionDeclaration':
      case 'AsyncGeneratorDeclaration':
      case 'ClassDeclaration':
        if (node.BindingIdentifier) {
          return BoundNames(node.BindingIdentifier);
        }

        return ['default'];

      case 'ImportSpecifier':
        return BoundNames(node.ImportedBinding);

      case 'ExportDeclaration':
        if (node.FromClause || node.NamedExports) {
          return [];
        }

        if (node.VariableStatement) {
          return BoundNames(node.VariableStatement);
        }

        if (node.Declaration) {
          return BoundNames(node.Declaration);
        }

        if (node.HoistableDeclaration) {
          const declarationNames = BoundNames(node.HoistableDeclaration);
          return declarationNames;
        }

        if (node.ClassDeclaration) {
          const declarationNames = BoundNames(node.ClassDeclaration);
          return declarationNames;
        }

        if (node.AssignmentExpression) {
          return ['default'];
        }

        throw new OutOfRange('BoundNames', node);

      case 'SingleNameBinding':
        return BoundNames(node.BindingIdentifier);

      case 'BindingRestElement':
        if (node.BindingIdentifier) {
          return BoundNames(node.BindingIdentifier);
        }

        return BoundNames(node.BindingPattern);

      case 'BindingRestProperty':
        return BoundNames(node.BindingIdentifier);

      case 'BindingElement':
        return BoundNames(node.BindingPattern);

      case 'BindingProperty':
        return BoundNames(node.BindingElement);

      case 'ObjectBindingPattern':
        {
          const names = BoundNames(node.BindingPropertyList);

          if (node.BindingRestProperty) {
            names.push(...BoundNames(node.BindingRestProperty));
          }

          return names;
        }

      case 'ArrayBindingPattern':
        {
          const names = BoundNames(node.BindingElementList);

          if (node.BindingRestElement) {
            names.push(...BoundNames(node.BindingRestElement));
          }

          return names;
        }

      default:
        return [];
    }
  }

  function VarDeclaredNames(node) {
    if (Array.isArray(node)) {
      const names = [];

      for (const item of node) {
        names.push(...VarDeclaredNames(item));
      }

      return names;
    }

    switch (node.type) {
      case 'VariableStatement':
        return BoundNames(node.VariableDeclarationList);

      case 'VariableDeclaration':
        return BoundNames(node);

      case 'IfStatement':
        {
          const names = VarDeclaredNames(node.Statement_a);

          if (node.Statement_b) {
            names.push(...VarDeclaredNames(node.Statement_b));
          }

          return names;
        }

      case 'Block':
        return VarDeclaredNames(node.StatementList);

      case 'WhileStatement':
        return VarDeclaredNames(node.Statement);

      case 'DoWhileStatement':
        return VarDeclaredNames(node.Statement);

      case 'ForStatement':
        {
          const names = [];

          if (node.VariableDeclarationList) {
            names.push(...VarDeclaredNames(node.VariableDeclarationList));
          }

          names.push(...VarDeclaredNames(node.Statement));
          return names;
        }

      case 'ForInStatement':
      case 'ForOfStatement':
      case 'ForAwaitStatement':
        {
          const names = [];

          if (node.ForBinding) {
            names.push(...BoundNames(node.ForBinding));
          }

          names.push(...VarDeclaredNames(node.Statement));
          return names;
        }

      case 'WithStatement':
        return VarDeclaredNames(node.Statement);

      case 'SwitchStatement':
        return VarDeclaredNames(node.CaseBlock);

      case 'CaseBlock':
        {
          const names = [];

          if (node.CaseClauses_a) {
            names.push(...VarDeclaredNames(node.CaseClauses_a));
          }

          if (node.DefaultClause) {
            names.push(...VarDeclaredNames(node.DefaultClause));
          }

          if (node.CaseClauses_b) {
            names.push(...VarDeclaredNames(node.CaseClauses_b));
          }

          return names;
        }

      case 'CaseClause':
      case 'DefaultClause':
        if (node.StatementList) {
          return VarDeclaredNames(node.StatementList);
        }

        return [];

      case 'LabelledStatement':
        return VarDeclaredNames(node.LabelledItem);

      case 'TryStatement':
        {
          const names = VarDeclaredNames(node.Block);

          if (node.Catch) {
            names.push(...VarDeclaredNames(node.Catch));
          }

          if (node.Finally) {
            names.push(...VarDeclaredNames(node.Finally));
          }

          return names;
        }

      case 'Catch':
        return VarDeclaredNames(node.Block);

      case 'Script':
        if (node.ScriptBody) {
          return VarDeclaredNames(node.ScriptBody);
        }

        return [];

      case 'ScriptBody':
        return TopLevelVarDeclaredNames(node.StatementList);

      case 'FunctionBody':
      case 'GeneratorBody':
      case 'AsyncFunctionBody':
      case 'AsyncGeneratorBody':
        return TopLevelVarDeclaredNames(node.FunctionStatementList);

      case 'ExportDeclaration':
        if (node.VariableStatement) {
          return BoundNames(node);
        }

        return [];

      default:
        return [];
    }
  }

  function TopLevelVarDeclaredNames(node) {
    if (Array.isArray(node)) {
      const names = [];

      for (const item of node) {
        names.push(...TopLevelVarDeclaredNames(item));
      }

      return names;
    }

    switch (node.type) {
      case 'ClassDeclaration':
      case 'LexicalDeclaration':
        return [];

      case 'FunctionDeclaration':
      case 'GeneratorDeclaration':
      case 'AsyncFunctionDeclaration':
      case 'AsyncGeneratorDeclaration':
        return BoundNames(node);

      default:
        return VarDeclaredNames(node);
    }
  }

  function VarScopedDeclarations(node) {
    if (Array.isArray(node)) {
      const declarations = [];

      for (const item of node) {
        declarations.push(...VarScopedDeclarations(item));
      }

      return declarations;
    }

    switch (node.type) {
      case 'VariableStatement':
        return VarScopedDeclarations(node.VariableDeclarationList);

      case 'VariableDeclaration':
        return [node];

      case 'Block':
        return VarScopedDeclarations(node.StatementList);

      case 'IfStatement':
        {
          const declarations = VarScopedDeclarations(node.Statement_a);

          if (node.Statement_b) {
            declarations.push(...VarScopedDeclarations(node.Statement_b));
          }

          return declarations;
        }

      case 'WhileStatement':
        return VarScopedDeclarations(node.Statement);

      case 'DoWhileStatement':
        return VarScopedDeclarations(node.Statement);

      case 'ForStatement':
        {
          const names = [];

          if (node.VariableDeclarationList) {
            names.push(...VarScopedDeclarations(node.VariableDeclarationList));
          }

          names.push(...VarScopedDeclarations(node.Statement));
          return names;
        }

      case 'ForInStatement':
      case 'ForOfStatement':
      case 'ForAwaitStatement':
        {
          const declarations = [];

          if (node.ForBinding) {
            declarations.push(node.ForBinding);
          }

          declarations.push(...VarScopedDeclarations(node.Statement));
          return declarations;
        }

      case 'WithStatement':
        return VarScopedDeclarations(node.Statement);

      case 'SwitchStatement':
        return VarScopedDeclarations(node.CaseBlock);

      case 'CaseBlock':
        {
          const names = [];

          if (node.CaseClauses_a) {
            names.push(...VarScopedDeclarations(node.CaseClauses_a));
          }

          if (node.DefaultClause) {
            names.push(...VarScopedDeclarations(node.DefaultClause));
          }

          if (node.CaseClauses_b) {
            names.push(...VarScopedDeclarations(node.CaseClauses_b));
          }

          return names;
        }

      case 'CaseClause':
      case 'DefaultClause':
        if (node.StatementList) {
          return VarScopedDeclarations(node.StatementList);
        }

        return [];

      case 'LabelledStatement':
        return VarScopedDeclarations(node.LabelledItem);

      case 'TryStatement':
        {
          const declarations = VarScopedDeclarations(node.Block);

          if (node.Catch) {
            declarations.push(...VarScopedDeclarations(node.Catch));
          }

          if (node.Finally) {
            declarations.push(...VarScopedDeclarations(node.Finally));
          }

          return declarations;
        }

      case 'Catch':
        return VarScopedDeclarations(node.Block);

      case 'ExportDeclaration':
        if (node.VariableStatement) {
          return VarScopedDeclarations(node.VariableStatement);
        }

        return [];

      case 'Script':
        if (node.ScriptBody) {
          return VarScopedDeclarations(node.ScriptBody);
        }

        return [];

      case 'ScriptBody':
        return TopLevelVarScopedDeclarations(node.StatementList);

      case 'Module':
        if (node.ModuleBody) {
          return VarScopedDeclarations(node.ModuleBody);
        }

        return [];

      case 'ModuleBody':
        return VarScopedDeclarations(node.ModuleItemList);

      case 'FunctionBody':
      case 'GeneratorBody':
      case 'AsyncFunctionBody':
      case 'AsyncGeneratorBody':
        return TopLevelVarScopedDeclarations(node.FunctionStatementList);

      default:
        return [];
    }
  }

  function TopLevelVarScopedDeclarations(node) {
    if (Array.isArray(node)) {
      const declarations = [];

      for (const item of node) {
        declarations.push(...TopLevelVarScopedDeclarations(item));
      }

      return declarations;
    }

    switch (node.type) {
      case 'ClassDeclaration':
      case 'LexicalDeclaration':
        return [];

      case 'FunctionDeclaration':
      case 'GeneratorDeclaration':
      case 'AsyncFunctionDeclaration':
      case 'AsyncGeneratorDeclaration':
        return [DeclarationPart(node)];

      default:
        return VarScopedDeclarations(node);
    }
  }

  function DeclarationPart(node) {
    return node;
  }

  function LexicallyScopedDeclarations(node) {
    if (Array.isArray(node)) {
      const declarations = [];

      for (const item of node) {
        declarations.push(...LexicallyScopedDeclarations(item));
      }

      return declarations;
    }

    switch (node.type) {
      case 'LabelledStatement':
        return LexicallyScopedDeclarations(node.LabelledItem);

      case 'Script':
        if (node.ScriptBody) {
          return LexicallyScopedDeclarations(node.ScriptBody);
        }

        return [];

      case 'ScriptBody':
        return TopLevelLexicallyScopedDeclarations(node.StatementList);

      case 'Module':
        if (node.ModuleBody) {
          return LexicallyScopedDeclarations(node.ModuleBody);
        }

        return [];

      case 'ModuleBody':
        return LexicallyScopedDeclarations(node.ModuleItemList);

      case 'FunctionBody':
      case 'GeneratorBody':
      case 'AsyncFunctionBody':
      case 'AsyncGeneratorBody':
        return TopLevelLexicallyScopedDeclarations(node.FunctionStatementList);

      case 'ImportDeclaration':
        return [];

      case 'ClassDeclaration':
      case 'LexicalDeclaration':
      case 'FunctionDeclaration':
      case 'GeneratorDeclaration':
      case 'AsyncFunctionDeclaration':
      case 'AsyncGeneratorDeclaration':
        return [DeclarationPart(node)];

      case 'CaseBlock':
        {
          const names = [];

          if (node.CaseClauses_a) {
            names.push(...LexicallyScopedDeclarations(node.CaseClauses_a));
          }

          if (node.DefaultClause) {
            names.push(...LexicallyScopedDeclarations(node.DefaultClause));
          }

          if (node.CaseClauses_b) {
            names.push(...LexicallyScopedDeclarations(node.CaseClauses_b));
          }

          return names;
        }

      case 'CaseClause':
      case 'DefaultClause':
        if (node.StatementList) {
          return LexicallyScopedDeclarations(node.StatementList);
        }

        return [];

      case 'ExportDeclaration':
        if (node.Declaration) {
          return [DeclarationPart(node.Declaration)];
        }

        if (node.HoistableDeclaration) {
          return [DeclarationPart(node.HoistableDeclaration)];
        }

        if (node.ClassDeclaration) {
          return [node.ClassDeclaration];
        }

        if (node.AssignmentExpression) {
          return [node];
        }

        return [];

      default:
        return [];
    }
  }

  function TopLevelLexicallyScopedDeclarations(node) {
    if (Array.isArray(node)) {
      const declarations = [];

      for (const item of node) {
        declarations.push(...TopLevelLexicallyScopedDeclarations(item));
      }

      return declarations;
    }

    switch (node.type) {
      case 'ClassDeclaration':
      case 'LexicalDeclaration':
        return [node];

      default:
        return [];
    }
  }

  function IsConstantDeclaration(node) {
    return node === 'const' || node.LetOrConst === 'const';
  }

  function IsInTailPosition(_node) {
    return false;
  }

  function ExpectedArgumentCount(FormalParameterList) {
    if (FormalParameterList.length === 0) {
      return 0;
    }

    let count = 0;

    for (const FormalParameter of FormalParameterList.slice(0, -1)) {
      const BindingElement = FormalParameter;

      if (HasInitializer(BindingElement)) {
        return count;
      }

      count += 1;
    }

    const last = FormalParameterList[FormalParameterList.length - 1];

    if (last.type === 'BindingRestElement') {
      return count;
    }

    if (HasInitializer(last)) {
      return count;
    }

    return count + 1;
  }

  function HasInitializer(node) {
    return !!node.Initializer;
  }

  function IsSimpleParameterList(node) {
    if (Array.isArray(node)) {
      for (const n of node) {
        if (!IsSimpleParameterList(n)) {
          return false;
        }
      }

      return true;
    }

    switch (node.type) {
      case 'SingleNameBinding':
        return node.Initializer === null;

      case 'BindingElement':
        return false;

      case 'BindingRestElement':
        return false;

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('IsSimpleParameterList', node);
    }
  }

  function ContainsExpression(node) {
    if (Array.isArray(node)) {
      for (const n of node) {
        if (ContainsExpression(n)) {
          return true;
        }
      }

      return false;
    }

    switch (node.type) {
      case 'SingleNameBinding':
        return !!node.Initializer;

      case 'BindingElement':
        if (ContainsExpression(node.BindingPattern)) {
          return true;
        }

        return !!node.Initializer;

      case 'ObjectBindingPattern':
        if (ContainsExpression(node.BindingPropertyList)) {
          return true;
        }

        if (node.BindingRestProperty) {
          return ContainsExpression(node.BindingRestProperty);
        }

        return false;

      case 'BindingProperty':
        if (node.PropertyName && node.PropertyName.ComputedPropertyName) {
          return true;
        }

        return ContainsExpression(node.BindingElement);

      case 'BindingRestProperty':
        if (node.BindingIdentifier) {
          return false;
        }

        return ContainsExpression(node.BindingPattern);

      case 'ArrayBindingPattern':
        if (ContainsExpression(node.BindingElementList)) {
          return true;
        }

        if (node.BindingRestElement) {
          return ContainsExpression(node.BindingRestElement);
        }

        return false;

      case 'BindingRestElement':
        if (node.BindingIdentifier) {
          return false;
        }

        return ContainsExpression(node.BindingPattern);

      case 'Elision':
        return false;

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('ContainsExpression', node);
    }
  }

  // #sec-static-semantics-isstrict
  function IsStrict({
    ScriptBody
  }) {
    // 1. If ScriptBody is present and the Directive Prologue of ScriptBody contains a Use Strict Directive, return true; otherwise, return false.
    return ScriptBody.strict;
  }

  // #sec-static-semantics-bodytext
  //  RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
  function BodyText(RegularExpressionLiteral) {
    return RegularExpressionLiteral.RegularExpressionBody;
  }

  // #sec-static-semantics-flagtext
  //   RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
  function FlagText(RegularExpressionLiteral) {
    return RegularExpressionLiteral.RegularExpressionFlags;
  }

  function ModuleRequests(node) {
    switch (node.type) {
      case 'Module':
        if (node.ModuleBody) {
          return ModuleRequests(node.ModuleBody);
        }

        return [];

      case 'ModuleBody':
        {
          const moduleNames = [];

          for (const item of node.ModuleItemList) {
            moduleNames.push(...ModuleRequests(item));
          }

          return moduleNames;
        }

      case 'ImportDeclaration':
        if (node.FromClause) {
          return ModuleRequests(node.FromClause);
        }

        return [StringValue(node.ModuleSpecifier)];

      case 'ExportDeclaration':
        if (node.FromClause) {
          return ModuleRequests(node.FromClause);
        }

        return [];

      case 'StringLiteral':
        return [StringValue(node)];

      default:
        return [];
    }
  }

  function ImportEntries(node) {
    switch (node.type) {
      case 'Module':
        if (node.ModuleBody) {
          return ImportEntries(node.ModuleBody);
        }

        return [];

      case 'ModuleBody':
        {
          const entries = [];

          for (const item of node.ModuleItemList) {
            entries.push(...ImportEntries(item));
          }

          return entries;
        }

      case 'ImportDeclaration':
        if (node.FromClause) {
          // 1. Let module be the sole element of ModuleRequests of FromClause.
          const module = ModuleRequests(node.FromClause)[0]; // 2. Return ImportEntriesForModule of ImportClause with argument module.

          return ImportEntriesForModule(node.ImportClause, module);
        }

        return [];

      default:
        return [];
    }
  }

  function ExportEntries(node) {
    if (Array.isArray(node)) {
      const entries = [];
      node.forEach(n => {
        entries.push(...ExportEntries(n));
      });
      return entries;
    }

    switch (node.type) {
      case 'Module':
        if (!node.ModuleBody) {
          return [];
        }

        return ExportEntries(node.ModuleBody);

      case 'ModuleBody':
        return ExportEntries(node.ModuleItemList);

      case 'ExportDeclaration':
        switch (true) {
          case !!node.ExportFromClause && !!node.FromClause:
            {
              // `export` ExportFromClause FromClause `;`
              // 1. Let module be the sole element of ModuleRequests of FromClause.
              const module = ModuleRequests(node.FromClause)[0]; // 2. Return ExportEntriesForModule(ExportFromClause, module).

              return ExportEntriesForModule(node.ExportFromClause, module);
            }

          case !!node.NamedExports:
            {
              // `export` NamedExports `;`
              // 1. Return ExportEntriesForModule(NamedExports, null).
              return ExportEntriesForModule(node.NamedExports, Value.null);
            }

          case !!node.VariableStatement:
            {
              // `export` VariableStatement
              // 1. Let entries be a new empty List.
              const entries = []; // 2. Let names be the BoundNames of VariableStatement.

              const names = BoundNames(node.VariableStatement); // 3. For each name in names, do

              for (const name of names) {
                // a. Append the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: name, [[ExportName]]: name } to entries.
                entries.push({
                  ModuleRequest: Value.null,
                  ImportName: Value.null,
                  LocalName: name,
                  ExportName: name
                });
              } // 4. Return entries.


              return entries;
            }

          case !!node.Declaration:
            {
              // `export` Declaration
              // 1. Let entries be a new empty List.
              const entries = []; // 2. Let names be the BoundNames of Declaration.

              const names = BoundNames(node.Declaration); // 3. For each name in names, do

              for (const name of names) {
                // a. Append the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: name, [[ExportName]]: name } to entries.
                entries.push({
                  ModuleRequest: Value.null,
                  ImportName: Value.null,
                  LocalName: name,
                  ExportName: name
                });
              } // 4. Return entries.


              return entries;
            }

          case node.default && !!node.HoistableDeclaration:
            {
              // `export` `default` HoistableDeclaration
              // 1. Let names be BoundNames of HoistableDeclaration.
              const names = BoundNames(node.HoistableDeclaration); // 2. Let localName be the sole element of names.

              const localName = names[0]; // 3. Return a new List containing the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: localName, [[ExportName]]: "default" }.

              return [{
                ModuleRequest: Value.null,
                ImportName: Value.null,
                LocalName: localName,
                ExportName: new Value('default')
              }];
            }

          case node.default && !!node.ClassDeclaration:
            {
              // `export` `default` ClassDeclaration
              // 1. Let names be BoundNames of ClassDeclaration.
              const names = BoundNames(node.ClassDeclaration); // 2. Let localName be the sole element of names.

              const localName = names[0]; // 3. Return a new List containing the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: localName, [[ExportName]]: "default" }.

              return [{
                ModuleRequest: Value.null,
                ImportName: Value.null,
                LocalName: localName,
                ExportName: new Value('default')
              }];
            }

          case node.default && !!node.AssignmentExpression:
            {
              // `export` `default` AssignmentExpression `;`
              // 1. Let entry be the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: ~default~, [[ExportName]]: "default" }.
              const entry = {
                ModuleRequest: Value.null,
                ImportName: Value.null,
                LocalName: 'default',
                ExportName: new Value('default')
              }; // 2. Return a new List containing entry.

              return [entry];
            }

          /*istanbul ignore next*/
          default:
            throw new OutOfRange('ExportEntries', node);
        }

      default:
        return [];
    }
  }

  // #sec-importedlocalnames
  function ImportedLocalNames(importEntries) {
    // 1. Let localNames be a new empty List.
    const localNames = []; // 2. For each ImportEntry Record i in importEntries, do

    for (const i of importEntries) {
      // a. Append i.[[LocalName]] to localNames.
      localNames.push(i.LocalName);
    } // 3. Return localNames.


    return localNames;
  }

  function IsDestructuring(node) {
    switch (node.type) {
      case 'ObjectBindingPattern':
      case 'ArrayBindingPattern':
      case 'ObjectLiteral':
      case 'ArrayLiteral':
        return true;

      case 'ForDeclaration':
        return IsDestructuring(node.ForBinding);

      case 'ForBinding':
        if (node.BindingIdentifier) {
          return false;
        }

        return true;

      default:
        return false;
    }
  }

  var regex=/[A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD23\uDE80-\uDEA9\uDEB0\uDEB1\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDFB0-\uDFC4\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDEB8\uDF00-\uDF1A]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCDF\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDEE0-\uDEF2\uDFB0]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD4E\uDEC0-\uDEEB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43\uDD4B]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A]/;

  var regex$1=/[0-9A-Z_a-z\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05EF-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u07FD\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u08D3-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u09FE\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D81-\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1878\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1ABF\u1AC0\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CD0-\u1CD2\u1CD4-\u1CFA\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA827\uA82C\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD27\uDD30-\uDD39\uDE80-\uDEA9\uDEAB\uDEAC\uDEB0\uDEB1\uDF00-\uDF1C\uDF27\uDF30-\uDF50\uDFB0-\uDFC4\uDFE0-\uDFF6]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD44-\uDD47\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDC9-\uDDCC\uDDCE-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3B-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC5E-\uDC61\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDC00-\uDC3A\uDCA0-\uDCE9\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD35\uDD37\uDD38\uDD3B-\uDD43\uDD50-\uDD59\uDDA0-\uDDA7\uDDAA-\uDDD7\uDDDA-\uDDE1\uDDE3\uDDE4\uDE00-\uDE3E\uDE47\uDE50-\uDE99\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD8E\uDD90\uDD91\uDD93-\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF6\uDFB0]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF4F-\uDF87\uDF8F-\uDF9F\uDFE0\uDFE1\uDFE3\uDFE4\uDFF0\uDFF1]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDD00-\uDD2C\uDD30-\uDD3D\uDD40-\uDD49\uDD4E\uDEC0-\uDEF9]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4B\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD83E[\uDFF0-\uDFF9]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A]|\uDB40[\uDD00-\uDDEF]/;

  var regex$2=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/;

  const MaybeAssignTokens = [// Logical
  ['NULLISH', '??', 3], ['OR', '||', 4], ['AND', '&&', 5], // Binop
  ['BIT_OR', '|', 6], ['BIT_XOR', '^', 7], ['BIT_AND', '&', 8], ['SHL', '<<', 11], ['SAR', '>>', 11], ['SHR', '>>>', 11], ['MUL', '*', 13], ['DIV', '/', 13], ['MOD', '%', 13], ['EXP', '**', 14], // Unop
  ['ADD', '+', 12], ['SUB', '-', 12]];
  const RawTokens = [// BEGIN PropertyOrCall
  // BEGIN Member
  // BEGIN Template
  ['TEMPLATE', '`'], // END Template
  // BEGIN Property
  ['PERIOD', '.'], ['LBRACK', '['], // END Property
  // END Member
  ['OPTIONAL', '?.'], ['LPAREN', '('], // END PropertyOrCall
  ['RPAREN', ')'], ['RBRACK', ']'], ['LBRACE', '{'], ['COLON', ':'], ['ELLIPSIS', '...'], ['CONDITIONAL', '?'], // BEGIN AutoSemicolon
  ['SEMICOLON', ';'], ['RBRACE', '}'], ['EOS', 'EOS'], // END AutoSemicolon
  // BEGIN ArrowOrAssign
  ['ARROW', '=>'], // BEGIN Assign
  ['ASSIGN', '=', 2], ...MaybeAssignTokens.map(t => [`ASSIGN_${t[0]}`, `${t[1]}=`, 2]), // END Assign
  // END ArrowOrAssign
  // Binary operators by precidence
  ['COMMA', ',', 1], ...MaybeAssignTokens, ['NOT', '!'], ['BIT_NOT', '~'], ['DELETE', 'delete'], ['TYPEOF', 'typeof'], ['VOID', 'void'], // BEGIN IsCountOp
  ['INC', '++'], ['DEC', '--'], // END IsCountOp
  // END IsUnaryOrCountOp
  ['EQ', '==', 9], ['EQ_STRICT', '===', 9], ['NE', '!=', 9], ['NE_STRICT', '!==', 9], ['LT', '<', 10], ['GT', '>', 10], ['LTE', '<=', 10], ['GTE', '>=', 10], ['INSTANCEOF', 'instanceof', 10], ['IN', 'in', 10], ['BREAK', 'break'], ['CASE', 'case'], ['CATCH', 'catch'], ['CONTINUE', 'continue'], ['DEBUGGER', 'debugger'], ['DEFAULT', 'default'], // DELETE
  ['DO', 'do'], ['ELSE', 'else'], ['FINALLY', 'finally'], ['FOR', 'for'], ['FUNCTION', 'function'], ['IF', 'if'], // IN
  // INSTANCEOF
  ['NEW', 'new'], ['RETURN', 'return'], ['SWITCH', 'switch'], ['THROW', 'throw'], ['TRY', 'try'], // TYPEOF
  ['VAR', 'var'], // VOID
  ['WHILE', 'while'], ['WITH', 'with'], ['THIS', 'this'], ['NULL', 'null'], ['TRUE', 'true'], ['FALSE', 'false'], ['NUMBER', null], ['STRING', null], ['BIGINT', null], // BEGIN Callable
  ['SUPER', 'super'], // BEGIN AnyIdentifier
  ['IDENTIFIER', null], ['AWAIT', 'await'], ['YIELD', 'yield'], // END AnyIdentifier
  // END Callable
  ['CLASS', 'class'], ['CONST', 'const'], ['EXPORT', 'export'], ['EXTENDS', 'extends'], ['IMPORT', 'import'], ['ENUM', 'enum'], ['ESCAPED_KEYWORD', null]];
  const Token = RawTokens.reduce((obj, [name], i) => {
    obj[name] = i;
    return obj;
  }, Object.create(null));
  const TokenNames = RawTokens.map(r => r[0]);
  const TokenPrecedence = RawTokens.map(r => r[2] || 0);
  const Keywords = RawTokens.filter(([name, raw]) => name.toLowerCase() === raw).map(([, raw]) => raw);
  const KeywordLookup = Keywords.reduce((obj, kw) => {
    obj[kw] = Token[kw.toUpperCase()];
    return obj;
  }, Object.create(null));
  const KeywordTokens = new Set(Object.values(KeywordLookup));

  const isInRange = (t, l, h) => t >= l && t <= h;

  const isAutomaticSemicolon = t => isInRange(t, Token.SEMICOLON, Token.EOS);
  const isMember = t => isInRange(t, Token.TEMPLATE, Token.LBRACK);
  const isPropertyOrCall = t => isInRange(t, Token.TEMPLATE, Token.LPAREN);
  const isKeyword = t => KeywordTokens.has(t);
  const isKeywordRaw = s => Keywords.includes(s);
  const ReservedWordsStrict = ['implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield'];
  const isReservedWordStrict = s => ReservedWordsStrict.includes(s);

  const isUnicodeIDStart = c => c && regex.test(c);

  const isUnicodeIDContinue = c => c && regex$1.test(c);

  const isDecimalDigit = c => c && /\d/u.test(c);
  const isHexDigit = c => c && /[\da-f]/ui.test(c);

  const isOctalDigit = c => c && /[0-7]/u.test(c);

  const isBinaryDigit = c => c === '0' || c === '1';

  const isWhitespace = c => c && (/[\u0009\u000B\u000C\u0020\u00A0\uFEFF]/u.test(c) || regex$2.test(c)); // eslint-disable-line no-control-regex

  const isLineTerminator = c => c && /[\r\n\u2028\u2029]/u.test(c);

  const isRegularExpressionFlagPart = c => c && (isUnicodeIDContinue(c) || c === '$');

  const isIdentifierStart = c => SingleCharTokens[c] === Token.IDENTIFIER || isUnicodeIDStart(c);
  const isIdentifierPart = c => SingleCharTokens[c] === Token.IDENTIFIER || c === '\u{200C}' || c === '\u{200D}' || isUnicodeIDContinue(c);
  const isLeadingSurrogate = cp => cp >= 0xD800 && cp <= 0xDBFF;
  const isTrailingSurrogate = cp => cp >= 0xDC00 && cp <= 0xDFFF;
  const SingleCharTokens = {
    '__proto__': null,
    '0': Token.NUMBER,
    '1': Token.NUMBER,
    '2': Token.NUMBER,
    '3': Token.NUMBER,
    '4': Token.NUMBER,
    '5': Token.NUMBER,
    '6': Token.NUMBER,
    '7': Token.NUMBER,
    '8': Token.NUMBER,
    '9': Token.NUMBER,
    'a': Token.IDENTIFIER,
    'b': Token.IDENTIFIER,
    'c': Token.IDENTIFIER,
    'd': Token.IDENTIFIER,
    'e': Token.IDENTIFIER,
    'f': Token.IDENTIFIER,
    'g': Token.IDENTIFIER,
    'h': Token.IDENTIFIER,
    'i': Token.IDENTIFIER,
    'j': Token.IDENTIFIER,
    'k': Token.IDENTIFIER,
    'l': Token.IDENTIFIER,
    'm': Token.IDENTIFIER,
    'n': Token.IDENTIFIER,
    'o': Token.IDENTIFIER,
    'p': Token.IDENTIFIER,
    'q': Token.IDENTIFIER,
    'r': Token.IDENTIFIER,
    's': Token.IDENTIFIER,
    't': Token.IDENTIFIER,
    'u': Token.IDENTIFIER,
    'v': Token.IDENTIFIER,
    'w': Token.IDENTIFIER,
    'x': Token.IDENTIFIER,
    'y': Token.IDENTIFIER,
    'z': Token.IDENTIFIER,
    'A': Token.IDENTIFIER,
    'B': Token.IDENTIFIER,
    'C': Token.IDENTIFIER,
    'D': Token.IDENTIFIER,
    'E': Token.IDENTIFIER,
    'F': Token.IDENTIFIER,
    'G': Token.IDENTIFIER,
    'H': Token.IDENTIFIER,
    'I': Token.IDENTIFIER,
    'J': Token.IDENTIFIER,
    'K': Token.IDENTIFIER,
    'L': Token.IDENTIFIER,
    'M': Token.IDENTIFIER,
    'N': Token.IDENTIFIER,
    'O': Token.IDENTIFIER,
    'P': Token.IDENTIFIER,
    'Q': Token.IDENTIFIER,
    'R': Token.IDENTIFIER,
    'S': Token.IDENTIFIER,
    'T': Token.IDENTIFIER,
    'U': Token.IDENTIFIER,
    'V': Token.IDENTIFIER,
    'W': Token.IDENTIFIER,
    'X': Token.IDENTIFIER,
    'Y': Token.IDENTIFIER,
    'Z': Token.IDENTIFIER,
    '$': Token.IDENTIFIER,
    '_': Token.IDENTIFIER,
    '\\': Token.IDENTIFIER,
    '.': Token.PERIOD,
    ',': Token.COMMA,
    ':': Token.COLON,
    ';': Token.SEMICOLON,
    '%': Token.MOD,
    '~': Token.BIT_NOT,
    '!': Token.NOT,
    '+': Token.ADD,
    '-': Token.SUB,
    '*': Token.MUL,
    '<': Token.LT,
    '>': Token.GT,
    '=': Token.ASSIGN,
    '?': Token.CONDITIONAL,
    '[': Token.LBRACK,
    ']': Token.RBRACK,
    '(': Token.LPAREN,
    ')': Token.RPAREN,
    '/': Token.DIV,
    '^': Token.BIT_XOR,
    '`': Token.TEMPLATE,
    '{': Token.LBRACE,
    '}': Token.RBRACE,
    '&': Token.BIT_AND,
    '|': Token.BIT_OR,
    '"': Token.STRING,
    '\'': Token.STRING
  };
  class Lexer {
    constructor() {
      this.currentToken = undefined;
      this.peekToken = undefined;
      this.peekAheadToken = undefined;
      this.position = 0;
      this.line = 1;
      this.columnOffset = 0;
      this.scannedValue = undefined;
      this.lineTerminatorBeforeNextToken = false;
      this.positionForNextToken = 0;
      this.lineForNextToken = 0;
      this.columnForNextToken = 0;
    }

    advance() {
      this.lineTerminatorBeforeNextToken = false;
      const type = this.nextToken();
      return {
        type,
        startIndex: this.positionForNextToken,
        endIndex: this.position,
        line: this.lineForNextToken,
        column: this.columnForNextToken,
        hadLineTerminatorBefore: this.lineTerminatorBeforeNextToken,
        name: TokenNames[type],
        value: type === Token.IDENTIFIER || type === Token.NUMBER || type === Token.BIGINT || type === Token.STRING || type === Token.ESCAPED_KEYWORD ? this.scannedValue : RawTokens[type][1]
      };
    }

    next() {
      this.currentToken = this.peekToken;

      if (this.peekAheadToken !== undefined) {
        this.peekToken = this.peekAheadToken;
        this.peekAheadToken = undefined;
      } else {
        this.peekToken = this.advance();
      }

      return this.currentToken;
    }

    peek() {
      if (this.peekToken === undefined) {
        this.next();
      }

      return this.peekToken;
    }

    peekAhead() {
      if (this.peekAheadToken === undefined) {
        this.peek();
        this.peekAheadToken = this.advance();
      }

      return this.peekAheadToken;
    }

    matches(token, peek) {
      if (typeof token === 'string') {
        if (peek.type === Token.IDENTIFIER && peek.value === token) {
          const escapeIndex = this.source.slice(peek.startIndex, peek.endIndex).indexOf('\\');

          if (escapeIndex !== -1) {
            return false;
          }

          return true;
        } else {
          return false;
        }
      }

      return peek.type === token;
    }

    test(token) {
      return this.matches(token, this.peek());
    }

    testAhead(token) {
      return this.matches(token, this.peekAhead());
    }

    eat(token) {
      if (this.test(token)) {
        this.next();
        return true;
      }

      return false;
    }

    expect(token) {
      if (this.test(token)) {
        return this.next();
      }

      return this.unexpected();
    }

    skipSpace() {
      loop: // eslint-disable-line no-labels
      while (this.position < this.source.length) {
        const c = this.source[this.position];

        switch (c) {
          case ' ':
          case '\t':
            this.position += 1;
            break;

          case '/':
            switch (this.source[this.position + 1]) {
              case '/':
                this.skipLineComment();
                break;

              case '*':
                this.skipBlockComment();
                break;

              default:
                break loop;
              // eslint-disable-line no-labels
            }

            break;

          default:
            if (isWhitespace(c)) {
              this.position += 1;
            } else if (isLineTerminator(c)) {
              this.position += 1;

              if (c === '\r' && this.source[this.position] === '\n') {
                this.position += 1;
              }

              this.line += 1;
              this.columnOffset = this.position;
              this.lineTerminatorBeforeNextToken = true;
              break;
            } else {
              break loop; // eslint-disable-line no-labels
            }

            break;
        }
      }
    }

    skipHashbangComment() {
      if (this.position === 0 && this.source[0] === '#' && this.source[1] === '!') {
        this.skipLineComment();
      }
    }

    skipLineComment() {
      while (this.position < this.source.length) {
        const c = this.source[this.position];
        this.position += 1;

        if (isLineTerminator(c)) {
          if (c === '\r' && this.source[this.position] === '\n') {
            this.position += 1;
          }

          this.line += 1;
          this.columnOffset = this.position;
          this.lineTerminatorBeforeNextToken = true;
          break;
        }
      }
    }

    skipBlockComment() {
      const end = this.source.indexOf('*/', this.position + 2);

      if (end === -1) {
        this.raise('UnterminatedComment', this.position);
      }

      this.position += 2;

      for (const match of this.source.slice(this.position, end).matchAll(/\r\n?|[\n\u2028\u2029]/ug)) {
        this.position = match.index;
        this.line += 1;
        this.columnOffset = this.position;
        this.lineTerminatorBeforeNextToken = true;
      }

      this.position = end + 2;
    }

    nextToken() {
      this.skipSpace(); // set token location info after skipping space

      this.positionForNextToken = this.position;
      this.lineForNextToken = this.line;
      this.columnForNextToken = this.position - this.columnOffset + 1;

      if (this.position >= this.source.length) {
        return Token.EOS;
      }

      const c = this.source[this.position];
      this.position += 1;
      const c1 = this.source[this.position];

      if (c.charCodeAt(0) <= 127) {
        const single = SingleCharTokens[c];

        switch (single) {
          case Token.LPAREN:
          case Token.RPAREN:
          case Token.LBRACE:
          case Token.RBRACE:
          case Token.LBRACK:
          case Token.RBRACK:
          case Token.COLON:
          case Token.SEMICOLON:
          case Token.COMMA:
          case Token.BIT_NOT:
          case Token.TEMPLATE:
            return single;

          case Token.CONDITIONAL:
            // ? ?. ?? ??=
            if (c1 === '.' && !isDecimalDigit(this.source[this.position + 1])) {
              this.position += 1;
              return Token.OPTIONAL;
            }

            if (c1 === '?') {
              this.position += 1;

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.ASSIGN_NULLISH;
              }

              return Token.NULLISH;
            }

            return Token.CONDITIONAL;

          case Token.LT:
            // < <= << <<=
            if (c1 === '=') {
              this.position += 1;
              return Token.LTE;
            }

            if (c1 === '<') {
              this.position += 1;

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.ASSIGN_SHL;
              }

              return Token.SHL;
            }

            return Token.LT;

          case Token.GT:
            // > >= >> >>= >>> >>>=
            if (c1 === '=') {
              this.position += 1;
              return Token.GTE;
            }

            if (c1 === '>') {
              this.position += 1;

              if (this.source[this.position] === '>') {
                this.position += 1;

                if (this.source[this.position] === '=') {
                  this.position += 1;
                  return Token.ASSIGN_SHR;
                }

                return Token.SHR;
              }

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.ASSIGN_SAR;
              }

              return Token.SAR;
            }

            return Token.GT;

          case Token.ASSIGN:
            // = == === =>
            if (c1 === '=') {
              this.position += 1;

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.EQ_STRICT;
              }

              return Token.EQ;
            }

            if (c1 === '>') {
              this.position += 1;
              return Token.ARROW;
            }

            return Token.ASSIGN;

          case Token.NOT:
            // ! != !==
            if (c1 === '=') {
              this.position += 1;

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.NE_STRICT;
              }

              return Token.NE;
            }

            return Token.NOT;

          case Token.ADD:
            // + ++ +=
            if (c1 === '+') {
              this.position += 1;
              return Token.INC;
            }

            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_ADD;
            }

            return Token.ADD;

          case Token.SUB:
            // - -- -=
            if (c1 === '-') {
              this.position += 1;
              return Token.DEC;
            }

            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_SUB;
            }

            return Token.SUB;

          case Token.MUL:
            // * *= ** **=
            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_MUL;
            }

            if (c1 === '*') {
              this.position += 1;

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.ASSIGN_EXP;
              }

              return Token.EXP;
            }

            return Token.MUL;

          case Token.MOD:
            // % %=
            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_MOD;
            }

            return Token.MOD;

          case Token.DIV:
            // / /=
            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_DIV;
            }

            return Token.DIV;

          case Token.BIT_AND:
            // & && &= &&=
            if (c1 === '&') {
              this.position += 1;

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.ASSIGN_AND;
              }

              return Token.AND;
            }

            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_BIT_AND;
            }

            return Token.BIT_AND;

          case Token.BIT_OR:
            // | || |=
            if (c1 === '|') {
              this.position += 1;

              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.ASSIGN_OR;
              }

              return Token.OR;
            }

            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_BIT_OR;
            }

            return Token.BIT_OR;

          case Token.BIT_XOR:
            // ^ ^=
            if (c1 === '=') {
              this.position += 1;
              return Token.ASSIGN_BIT_XOR;
            }

            return Token.BIT_XOR;

          case Token.PERIOD:
            // . ... NUMBER
            if (isDecimalDigit(c1)) {
              this.position -= 1;
              return this.scanNumber();
            }

            if (c1 === '.') {
              if (this.source[this.position + 1] === '.') {
                this.position += 2;
                return Token.ELLIPSIS;
              }
            }

            return Token.PERIOD;

          case Token.STRING:
            return this.scanString(c);

          case Token.NUMBER:
            this.position -= 1;
            return this.scanNumber();

          case Token.IDENTIFIER:
            this.position -= 1;
            return this.scanIdentifierOrKeyword();

          default:
            this.unexpected(single);
            break;
        }
      }

      this.position -= 1;

      if (isLeadingSurrogate(c.charCodeAt(0)) || isIdentifierStart(c)) {
        return this.scanIdentifierOrKeyword();
      }

      return this.unexpected(this.position);
    }

    scanNumber() {
      const start = this.position;
      let base = 10;
      let check = isDecimalDigit;

      if (this.source[this.position] === '0') {
        this.scannedValue = 0;
        this.position += 1;

        switch (this.source[this.position]) {
          case 'x':
          case 'X':
            base = 16;
            break;

          case 'o':
          case 'O':
            base = 8;
            break;

          case 'b':
          case 'B':
            base = 2;
            break;

          case '.':
          case 'e':
          case 'E':
            break;

          case 'n':
            this.position += 1;
            this.scannedValue = 0n;
            return Token.BIGINT;

          default:
            return Token.NUMBER;
        }

        check = {
          16: isHexDigit,
          10: isDecimalDigit,
          8: isOctalDigit,
          2: isBinaryDigit
        }[base];

        if (base !== 10) {
          if (!check(this.source[this.position + 1])) {
            return Token.NUMBER;
          }

          this.position += 1;
        }
      }

      while (this.position < this.source.length) {
        const c = this.source[this.position];

        if (check(c)) {
          this.position += 1;
        } else if (c === '_') {
          if (!check(this.source[this.position + 1])) {
            this.unexpected(this.position + 1);
          }

          this.position += 1;
        } else {
          break;
        }
      }

      if (this.source[this.position] === 'n') {
        const buffer = this.source.slice(start, this.position).replace(/_/g, '');
        this.position += 1;
        this.scannedValue = BigInt(buffer);
        return Token.BIGINT;
      }

      if (base === 10 && this.source[this.position] === '.') {
        this.position += 1;

        if (this.source[this.position] === '_') {
          this.unexpected(this.position);
        }

        while (this.position < this.source.length) {
          const c = this.source[this.position];

          if (isDecimalDigit(c)) {
            this.position += 1;
          } else if (c === '_') {
            if (!isDecimalDigit(this.source[this.position + 1])) {
              this.unexpected(this.position + 1);
            }

            this.position += 1;
          } else {
            break;
          }
        }
      }

      if (base === 10 && (this.source[this.position] === 'E' || this.source[this.position] === 'e')) {
        this.position += 1;

        if (this.source[this.position] === '_') {
          this.unexpected(this.position);
        }

        if (this.source[this.position] === '-' || this.source[this.position] === '+') {
          this.position += 1;
        }

        if (this.source[this.position] === '_') {
          this.unexpected(this.position);
        }

        while (this.position < this.source.length) {
          const c = this.source[this.position];

          if (isDecimalDigit(c)) {
            this.position += 1;
          } else if (c === '_') {
            if (!isDecimalDigit(this.source[this.position + 1])) {
              this.unexpected(this.position + 1);
            }

            this.position += 1;
          } else {
            break;
          }
        }
      }

      if (isIdentifierStart(this.source[this.position])) {
        this.unexpected(this.position);
      }

      const buffer = this.source.slice(base === 10 ? start : start + 2, this.position).replace(/_/g, '');
      this.scannedValue = base === 10 ? Number.parseFloat(buffer, base) : Number.parseInt(buffer, base);
      return Token.NUMBER;
    }

    scanString(char) {
      let buffer = '';

      while (true) {
        if (this.position >= this.source.length) {
          this.raise('UnterminatedString', this.position);
        }

        const c = this.source[this.position];

        if (c === char) {
          this.position += 1;
          break;
        }

        if (c === '\r' || c === '\n') {
          this.raise('UnterminatedString', this.position);
        }

        this.position += 1;

        if (c === '\\') {
          const l = this.source[this.position];

          if (isLineTerminator(l)) {
            this.position += 1;

            if (l === '\r' && this.source[this.position] === '\n') {
              this.position += 1;
            }

            this.line += 1;
            this.columnOffset = this.position;
            this.lineTerminatorBeforeNextToken = true;
          } else {
            buffer += this.scanEscapeSequence();
          }
        } else {
          buffer += c;
        }
      }

      this.scannedValue = buffer;
      return Token.STRING;
    }

    scanEscapeSequence() {
      const c = this.source[this.position];

      switch (c) {
        case 'b':
          this.position += 1;
          return '\b';

        case 't':
          this.position += 1;
          return '\t';

        case 'n':
          this.position += 1;
          return '\n';

        case 'v':
          this.position += 1;
          return '\v';

        case 'f':
          this.position += 1;
          return '\f';

        case 'r':
          this.position += 1;
          return '\r';

        case 'x':
          this.position += 1;
          return String.fromCodePoint(this.scanHex(2));

        case 'u':
          this.position += 1;
          return String.fromCodePoint(this.scanCodePoint());

        default:
          if (c === '0' && !isDecimalDigit(this.source[this.position + 1])) {
            this.position += 1;
            return '\u{0000}';
          } else if (this.isStrictMode() && isDecimalDigit(c)) {
            this.raise('IllegalOctalEscape', this.position);
          }

          this.position += 1;
          return c;
      }
    }

    scanCodePoint() {
      if (this.source[this.position] === '{') {
        const end = this.source.indexOf('}', this.position);
        this.position += 1;
        const code = this.scanHex(end - this.position);
        this.position += 1;

        if (code > 0x10FFFF) {
          this.raise('InvalidCodePoint', this.position);
        }

        return code;
      }

      return this.scanHex(4);
    }

    scanHex(length) {
      if (length === 0) {
        this.raise('InvalidCodePoint', this.position);
      }

      let n = 0;

      for (let i = 0; i < length; i += 1) {
        const c = this.source[this.position];

        if (isHexDigit(c)) {
          this.position += 1;
          n = n << 4 | Number.parseInt(c, 16);
        } else {
          this.unexpected(this.position);
        }
      }

      return n;
    }

    scanIdentifierOrKeyword() {
      let buffer = '';
      let escapeIndex = -1;
      let check = isIdentifierStart;

      while (this.position < this.source.length) {
        const c = this.source[this.position];
        const code = c.charCodeAt(0);

        if (c === '\\') {
          if (escapeIndex === -1) {
            escapeIndex = this.position;
          }

          this.position += 1;

          if (this.source[this.position] !== 'u') {
            this.raise('InvalidUnicodeEscape', this.position);
          }

          this.position += 1;
          const raw = String.fromCodePoint(this.scanCodePoint());

          if (!check(raw)) {
            this.raise('InvalidUnicodeEscape', this.position);
          }

          buffer += raw;
        } else if (isLeadingSurrogate(code)) {
          const lowSurrogate = this.source.charCodeAt(this.position + 1);

          if (!isTrailingSurrogate(lowSurrogate)) {
            this.raise('InvalidUnicodeEscape', this.position);
          }

          const codePoint = UTF16SurrogatePairToCodePoint(code, lowSurrogate);
          const raw = String.fromCodePoint(codePoint);

          if (!check(raw)) {
            this.raise('InvalidUnicodeEscape', this.position);
          }

          this.position += 2;
          buffer += raw;
        } else if (check(c)) {
          buffer += c;
          this.position += 1;
        } else {
          break;
        }

        check = isIdentifierPart;
      }

      if (isKeywordRaw(buffer)) {
        if (escapeIndex !== -1) {
          this.scannedValue = buffer;
          return Token.ESCAPED_KEYWORD;
        }

        return KeywordLookup[buffer];
      } else {
        this.scannedValue = buffer;
        return Token.IDENTIFIER;
      }
    }

    scanRegularExpressionBody() {
      let inClass = false;
      let buffer = this.peek().type === Token.ASSIGN_DIV ? '=' : '';

      while (true) {
        if (this.position >= this.source.length) {
          this.raise('UnterminatedRegExp', this.position);
        }

        const c = this.source[this.position];

        switch (c) {
          case '[':
            inClass = true;
            this.position += 1;
            buffer += c;
            break;

          case ']':
            if (inClass) {
              inClass = false;
            }

            buffer += c;
            this.position += 1;
            break;

          case '/':
            this.position += 1;

            if (!inClass) {
              this.scannedValue = buffer;
              return;
            }

            buffer += c;
            break;

          case '\\':
            buffer += c;
            this.position += 1;

            if (isLineTerminator(this.source[this.position])) {
              this.raise('UnterminatedRegExp', this.position);
            }

            buffer += this.source[this.position];
            this.position += 1;
            break;

          default:
            if (isLineTerminator(c)) {
              this.raise('UnterminatedRegExp', this.position);
            }

            this.position += 1;
            buffer += c;
            break;
        }
      }
    }

    scanRegularExpressionFlags() {
      let buffer = '';

      while (true) {
        if (this.position >= this.source.length) {
          this.scannedValue = buffer;
          return;
        }

        const c = this.source[this.position];

        if (isRegularExpressionFlagPart(c) && 'gimsuy'.includes(c) && !buffer.includes(c)) {
          this.position += 1;
          buffer += c;
        } else {
          this.scannedValue = buffer;
          return;
        }
      }
    }

  }

  function TV(s) {
    let buffer = '';

    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === '\\') {
        i += 1;

        switch (s[i]) {
          case '\\':
            buffer += '\\';
            break;

          case '`':
            buffer += '`';
            break;

          case '\'':
            buffer += '\'';
            break;

          case '"':
            buffer += '"';
            break;

          case 'b':
            buffer += '\b';
            break;

          case 'f':
            buffer += '\f';
            break;

          case 'n':
            buffer += '\n';
            break;

          case 'r':
            buffer += '\r';
            break;

          case 't':
            buffer += '\t';
            break;

          case 'v':
            buffer += '\v';
            break;

          case 'x':
            i += 1;

            if (isHexDigit(s[i]) && isHexDigit(s[i + 1])) {
              const n = Number.parseInt(s.slice(i, i + 2), 16);
              i += 2;
              buffer += String.fromCharCode(n);
            } else {
              return undefined;
            }

            break;

          case 'u':
            i += 1;

            if (s[i] === '{') {
              i += 1;
              const start = i;

              do {
                i += 1;
              } while (isHexDigit(s[i]));

              if (s[i] !== '}') {
                return undefined;
              }

              const n = Number.parseInt(s.slice(start, i), 16);

              if (n > 0x10FFFF) {
                return undefined;
              }

              buffer += String.fromCodePoint(n);
            } else if (isHexDigit(s[i]) && isHexDigit(s[i + 1]) && isHexDigit(s[i + 2]) && isHexDigit(s[i + 3])) {
              const n = Number.parseInt(s.slice(i, i + 4), 16);
              i += 3;
              buffer += String.fromCodePoint(n);
            } else {
              return undefined;
            }

            break;

          case '0':
            if (isDecimalDigit(s[i + 1])) {
              return undefined;
            }

            return '\u{0000}';

          default:
            if (isLineTerminator(s)) {
              return '';
            }

            return undefined;
        }
      } else {
        buffer += s[i];
      }
    }

    return buffer;
  }
  function TemplateStrings(node, raw) {
    if (raw) {
      return node.TemplateSpanList.map(s => new Value(s));
    }

    return node.TemplateSpanList.map(v => {
      const tv = TV(v);

      if (tv === undefined) {
        return Value.undefined;
      }

      return new Value(tv);
    });
  }

  function ImportEntriesForModule(node, module) {
    switch (node.type) {
      case 'ImportClause':
        switch (true) {
          case !!node.ImportedDefaultBinding && !!node.NameSpaceImport:
            {
              // 1. Let entries be ImportEntriesForModule of ImportedDefaultBinding with argument module.
              const entries = ImportEntriesForModule(node.ImportedDefaultBinding, module); // 2. Append to entries the elements of the ImportEntriesForModule of NameSpaceImport with argument module.

              entries.push(...ImportEntriesForModule(node.NameSpaceImport, module)); // 3. Return entries.

              return entries;
            }

          case !!node.ImportedDefaultBinding && !!node.NamedImports:
            {
              // 1. Let entries be ImportEntriesForModule of ImportedDefaultBinding with argument module.
              const entries = ImportEntriesForModule(node.ImportedDefaultBinding, module); // 2. Append to entries the elements of the ImportEntriesForModule of NamedImports with argument module.

              entries.push(...ImportEntriesForModule(node.NamedImports, module)); // 3. Return entries.

              return entries;
            }

          case !!node.ImportedDefaultBinding:
            return ImportEntriesForModule(node.ImportedDefaultBinding, module);

          case !!node.NameSpaceImport:
            return ImportEntriesForModule(node.NameSpaceImport, module);

          case !!node.NamedImports:
            return ImportEntriesForModule(node.NamedImports, module);

          /*istanbul ignore next*/
          default:
            throw new OutOfRange('ImportEntriesForModule', node);
        }

      case 'ImportedDefaultBinding':
        {
          // 1. Let localName be the sole element of BoundNames of ImportedBinding.
          const localName = BoundNames(node.ImportedBinding)[0]; // 2. Let defaultEntry be the ImportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: "default", [[LocalName]]: localName }.

          const defaultEntry = {
            ModuleRequest: module,
            ImportName: new Value('default'),
            LocalName: localName
          }; // 3. Return a new List containing defaultEntry.

          return [defaultEntry];
        }

      case 'NameSpaceImport':
        {
          // 1. Let localName be the StringValue of ImportedBinding.
          const localName = StringValue(node.ImportedBinding); // 2. Let entry be the ImportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~star~, [[LocalName]]: localName }.

          const entry = {
            ModuleRequest: module,
            ImportName: 'star',
            LocalName: localName
          }; // 3. Return a new List containing entry.

          return [entry];
        }

      case 'NamedImports':
        {
          const specs = [];
          node.ImportsList.forEach(n => {
            specs.push(...ImportEntriesForModule(n, module));
          });
          return specs;
        }

      case 'ImportSpecifier':
        if (node.IdentifierName) {
          // 1. Let importName be the StringValue of IdentifierName.
          const importName = StringValue(node.IdentifierName); // 2. Let localName be the StringValue of ImportedBinding.

          const localName = StringValue(node.ImportedBinding); // 3. Let entry be the ImportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: importName, [[LocalName]]: localName }.

          const entry = {
            ModuleRequest: module,
            ImportName: importName,
            LocalName: localName
          }; // 4. Return a new List containing entry.

          return [entry];
        } else if (node.ModuleExportName) {
          // 1. Let importName be the StringValue of ModuleExportName.
          const importName = StringValue(node.ModuleExportName); // 2. Let localName be the StringValue of ImportedBinding.

          const localName = StringValue(node.ImportedBinding); // 3. Let entry be the ImportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: importName, [[LocalName]]: localName }.

          const entry = {
            ModuleRequest: module,
            ImportName: importName,
            LocalName: localName
          }; // 4. Return a new List containing entry.

          return [entry];
        } else {
          // 1. Let localName be the sole element of BoundNames of ImportedBinding.
          const localName = BoundNames(node.ImportedBinding)[0]; // 2. Let entry be the ImportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: localName, [[LocalName]]: localName }.

          const entry = {
            ModuleRequest: module,
            ImportName: localName,
            LocalName: localName
          }; // 3. Return a new List containing entry.

          return [entry];
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('ImportEntriesForModule', node);
    }
  }

  function ExportEntriesForModule(node, module) {
    if (Array.isArray(node)) {
      const specs = [];
      node.forEach(n => {
        specs.push(...ExportEntriesForModule(n, module));
      });
      return specs;
    }

    switch (node.type) {
      case 'ExportFromClause':
        if (node.IdentifierName) {
          // 1. Let exportName be the StringValue of IdentifierName.
          const exportName = StringValue(node.IdentifierName); // 2. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~star~, [[LocalName]]: null, [[ExportName]]: exportName }.

          const entry = {
            ModuleRequest: module,
            ImportName: 'star',
            LocalName: Value.null,
            ExportName: exportName
          }; // 3. Return a new List containing entry.

          return [entry];
        } else if (node.ModuleExportName) {
          // 1. Let exportName be the StringValue of ModuleExportName.
          const exportName = StringValue(node.ModuleExportName); // 2. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~star~, [[LocalName]]: null, [[ExportName]]: exportName }.

          const entry = {
            ModuleRequest: module,
            ImportName: 'star',
            LocalName: Value.null,
            ExportName: exportName
          }; // 3. Return a new List containing entry.

          return [entry];
        } else {
          // 1. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~star~, [[LocalName]]: null, [[ExportName]]: null }.
          const entry = {
            ModuleRequest: module,
            ImportName: 'star',
            LocalName: Value.null,
            ExportName: Value.null
          }; // 2. Return a new List containing entry.

          return [entry];
        }

      case 'ExportSpecifier':
        {
          const sourceName = StringValue(node.localName);
          const exportName = StringValue(node.exportName);
          let localName;
          let importName;

          if (module === Value.null) {
            localName = sourceName;
            importName = Value.null;
          } else {
            // 4. Else,
            localName = Value.null;
            importName = sourceName;
          }

          return [{
            ModuleRequest: module,
            ImportName: importName,
            LocalName: localName,
            ExportName: exportName
          }];
        }

      case 'NamedExports':
        return ExportEntriesForModule(node.ExportsList, module);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('ExportEntriesForModule', node);
    }
  }

  function CharacterValue(node) {
    switch (node.type) {
      case 'CharacterEscape':
        switch (true) {
          case !!node.ControlEscape:
            switch (node.ControlEscape) {
              case 't':
                return 0x0009;

              case 'n':
                return 0x000A;

              case 'v':
                return 0x000B;

              case 'f':
                return 0x000C;

              case 'r':
                return 0x000D;

              /*istanbul ignore next*/
              default:
                throw new OutOfRange('Evaluate_CharacterEscape', node);
            }

          case !!node.ControlLetter:
            {
              // 1. Let ch be the code point matched by ControlLetter.
              const ch = node.ControlLetter; // 2. Let i be ch's code point value.

              const i = ch.codePointAt(0); // 3. Return the remainder of dividing i by 32.

              return i % 32;
            }

          case !!node.HexEscapeSequence:
            // 1. Return the numeric value of the code unit that is the SV of HexEscapeSequence.
            return Number.parseInt(`${node.HexEscapeSequence.HexDigit_a}${node.HexEscapeSequence.HexDigit_b}`, 16);

          case !!node.RegExpUnicodeEscapeSequence:
            return CharacterValue(node.RegExpUnicodeEscapeSequence);

          case node.subtype === '0':
            // 1. Return the code point value of U+0000 (NULL).
            return 0x0000;

          case !!node.IdentityEscape:
            {
              // 1. Let ch be the code point matched by IdentityEscape.
              const ch = node.IdentityEscape.codePointAt(0); // 2. Return the code point value of ch.

              return ch;
            }

          /*istanbul ignore next*/
          default:
            throw new OutOfRange('Evaluate_CharacterEscape', node);
        }

      case 'RegExpUnicodeEscapeSequence':
        switch (true) {
          case 'Hex4Digits' in node:
            return node.Hex4Digits;

          case 'CodePoint' in node:
            return node.CodePoint;

          case 'HexTrailSurrogate' in node:
            return UTF16SurrogatePairToCodePoint(node.HexLeadSurrogate, node.HexTrailSurrogate);

          case 'HexLeadSurrogate' in node:
            return node.HexLeadSurrogate;

          /*istanbul ignore next*/
          default:
            throw new OutOfRange('Evaluate_CharacterEscape', node);
        }

      case 'ClassAtom':
        switch (true) {
          case node.value === '-':
            // 1. Return the code point value of U+002D (HYPHEN-MINUS).
            return 0x002D;

          case !!node.SourceCharacter:
            {
              // 1. Let ch be the code point matched by SourceCharacter.
              const ch = node.SourceCharacter.codePointAt(0); // 2. Return ch.

              return ch;
            }

          /*istanbul ignore next*/
          default:
            throw new OutOfRange('CharacterValue', node);
        }

      case 'ClassEscape':
        switch (true) {
          case node.value === 'b':
            // 1. Return the code point value of U+0008 (BACKSPACE).
            return 0x0008;

          case node.value === '-':
            // 1. Return the code point value of U+002D (HYPHEN-MINUS).
            return 0x002D;

          case !!node.CharacterEscape:
            return CharacterValue(node.CharacterEscape);

          /*istanbul ignore next*/
          default:
            throw new OutOfRange('CharacterValue', node);
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('CharacterValue', node);
    }
  }

  function UTF16SurrogatePairToCodePoint(lead, trail) {
    // 1. Assert: lead is a leading surrogate and trail is a trailing surrogate.
    Assert(isLeadingSurrogate(lead) && isTrailingSurrogate(trail), "isLeadingSurrogate(lead) && isTrailingSurrogate(trail)"); // 2. Let cp be (lead - 0xD800) × 0x400 + (trail - 0xDC00) + 0x10000.

    const cp = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000; // 3. Return the code point cp.

    return cp;
  }

  function CodePointAt(string, position) {
    // 1 .Let size be the length of string.
    const size = string.length; // 2. Assert: position ≥ 0 and position < size.

    Assert(position >= 0 && position < size, "position >= 0 && position < size"); // 3. Let first be the code unit at index position within string.

    const first = string.charCodeAt(position); // 4. Let cp be the code point whose numeric value is that of first.

    let cp = first; // 5. If first is not a leading surrogate or trailing surrogate, then

    if (!isLeadingSurrogate(first) && !isTrailingSurrogate(first)) {
      // a. Return the Record { [[CodePoint]]: cp, [[CodeUnitCount]]: 1, [[IsUnpairedSurrogate]]: false }.
      return {
        CodePoint: cp,
        CodeUnitCount: 1,
        IsUnpairedSurrogate: false
      };
    } // 6. If first is a trailing surrogate or position + 1 = size, then


    if (isTrailingSurrogate(first) || position + 1 === size) {
      // a. Return the Record { [[CodePoint]]: cp, [[CodeUnitCount]]: 1, [[IsUnpairedSurrogate]]: true }.
      return {
        CodePoint: cp,
        CodeUnitCount: 1,
        IsUnpairedSurrogate: true
      };
    } // 7. Let second be the code unit at index position + 1 within string.


    const second = string.charCodeAt(position + 1); // 8. If seconds is not a trailing surrogate, then

    if (!isTrailingSurrogate(second)) {
      // a. Return the Record { [[CodePoint]]: cp, [[CodeUnitCount]]: 1, [[IsUnpairedSurrogate]]: true }.
      return {
        CodePoint: cp,
        CodeUnitCount: 1,
        IsUnpairedSurrogate: true
      };
    } // 9. Set cp to ! UTF16SurrogatePairToCodePoint(first, second).


    let _temp = UTF16SurrogatePairToCodePoint(first, second);

    Assert(!(_temp instanceof AbruptCompletion), "UTF16SurrogatePairToCodePoint(first, second)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    cp = _temp; // 10. Return the Record { [[CodePoint]]: cp, [[CodeUnitCount]]: 2, [[IsUnpairedSurrogate]]: false }.

    return {
      CodePoint: cp,
      CodeUnitCount: 2,
      IsUnpairedSurrogate: false
    };
  }

  function CodePointToUTF16CodeUnits(cp) {
    // 1. Assert: 0 ≤ cp ≤ 0x10FFFF.
    Assert(cp >= 0 && cp <= 0x10FFFF, "cp >= 0 && cp <= 0x10FFFF"); // 2. If cp ≤ 0xFFFF, return cp.

    if (cp <= 0xFFFF) {
      return [cp];
    } // 3. Let cu1 be floor((cp - 0x10000) / 0x400) + 0xD800.


    const cu1 = Math.floor((cp - 0x10000) / 0x400) + 0xD800; // 4. Let cu2 be ((cp - 0x10000) modulo 0x400) + 0xDC00.

    const cu2 = (cp - 0x10000) % 0x400 + 0xDC00; // 5. Return the code unit sequence consisting of cu1 followed by cu2.

    return [cu1, cu2];
  }

  function StringToCodePoints(string) {
    // 1. Let codePoints be a new empty List.
    const codePoints = []; // 2. Let size be the length of string.

    const size = string.length; // 3. Let position be 0.

    let position = 0; // 4. Repeat, while position < size,

    while (position < size) {
      let _temp = CodePointAt(string, position);

      Assert(!(_temp instanceof AbruptCompletion), "CodePointAt(string, position)" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // a. Let cp be ! CodePointAt(string, position).
      const cp = _temp; // b. Append cp.[[CodePoint]] to codePoints.

      codePoints.push(cp.CodePoint); // c. Set position to position + cp.[[CodeUnitCount]].

      position += cp.CodeUnitCount;
    } // 5. Return codePoints.


    return codePoints;
  }

  function CodePointsToString(text) {
    // 1. Let result be the empty String.
    let result = ''; // 2. For each code point cp in text, do

    for (const cp of text) {
      let _temp = CodePointToUTF16CodeUnits(cp);

      Assert(!(_temp instanceof AbruptCompletion), "CodePointToUTF16CodeUnits(cp)" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // a. Set result to the string-concatenation of result and ! CodePointToUTF16CodeUnits(cp).
      result += _temp.map(c => String.fromCodePoint(c)).join('');
    } // 3. Return result.


    return result;
  }

  function IsStringValidUnicode(string) {
    string = string.stringValue(); // 1. Let _strLen_ be the number of code units in string.

    const strLen = string.length; // 2. Let k be 0.

    let k = 0; // 3. Repeat, while k does not equal strLen,

    while (k !== strLen) {
      let _temp = CodePointAt(string, k);

      Assert(!(_temp instanceof AbruptCompletion), "CodePointAt(string, k)" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // a. Let cp be ! CodePointAt(string, k).
      const cp = _temp; // b. If cp.[[IsUnpairedSurrogate]] is true, return false.

      if (cp.IsUnpairedSurrogate) {
        return false;
      } // c. Set k to k + cp.[[CodeUnitCount]].


      k += cp.CodeUnitCount;
    }

    return true;
  }

  function IsComputedPropertyKey(node) {
    return node.type !== 'IdentifierName' && node.type !== 'StringLiteral' && node.type !== 'NumericLiteral';
  }

  // IdentifierReference :
  //   Identifier
  //   `yield`
  //   `await`

  function Evaluate_IdentifierReference(IdentifierReference) {
    // 1. Return ? ResolveBinding(StringValue of Identifier).
    return ResolveBinding(StringValue(IdentifierReference), undefined, IdentifierReference.strict);
  }

  // PrimaryExpression : `this`

  function Evaluate_This(_PrimaryExpression) {
    return ResolveThisBinding();
  }

  // Literal :
  //   NullLiteral
  //   BooleanLiteral
  //   NumericLiteral
  //   StringLiteral

  function Evaluate_Literal(Literal) {
    switch (Literal.type) {
      case 'NullLiteral':
        // 1. Return null.
        return Value.null;

      case 'BooleanLiteral':
        // 1. If BooleanLiteral is the token false, return false.
        if (Literal.value === false) {
          return Value.false;
        } // 2. If BooleanLiteral is the token true, return true.


        if (Literal.value === true) {
          return Value.true;
        }

        throw new OutOfRange('Evaluate_Literal', Literal);

      case 'NumericLiteral':
        // 1. Return the NumericValue of NumericLiteral as defined in 11.8.3.
        return NumericValue(Literal);

      case 'StringLiteral':
        return StringValue(Literal);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_Literal', Literal);
    }
  }

  // ClassExpression :
  //   `class` ClassTail
  //   `class` BindingIdentifier ClassTail

  function* Evaluate_ClassExpression(ClassExpression) {
    const {
      BindingIdentifier,
      ClassTail
    } = ClassExpression;

    if (!BindingIdentifier) {
      let _temp = yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, new Value(''));
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // 1. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments undefined and ''
      const value = _temp; // 2. Set value.[[SourceText]] to the source text matched by ClassExpression.

      value.SourceText = sourceTextMatchedBy(ClassExpression); // 3. Return value.

      return value;
    } // 1. Let className be StringValue of BindingIdentifier.


    const className = StringValue(BindingIdentifier); // 2. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments className and className.

    let _temp2 = yield* ClassDefinitionEvaluation(ClassTail, className, className);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const value = _temp2; // Set value.[[SourceText]] to the source text matched by ClassExpression.

    value.SourceText = sourceTextMatchedBy(ClassExpression); // Return value.

    return value;
  }

  function* Evaluate(node) {
    exports.surroundingAgent.runningExecutionContext.callSite.setLocation(node);

    if (exports.surroundingAgent.hostDefinedOptions.onNodeEvaluation) {
      exports.surroundingAgent.hostDefinedOptions.onNodeEvaluation(node, exports.surroundingAgent.currentRealmRecord);
    }

    switch (node.type) {
      // Language
      case 'Script':
        return yield* Evaluate_Script(node);

      case 'ScriptBody':
        return yield* Evaluate_ScriptBody(node);

      case 'Module':
        return yield* Evaluate_Module(node);

      case 'ModuleBody':
        return yield* Evaluate_ModuleBody(node);
      // Statements

      case 'Block':
        return yield* Evaluate_Block(node);

      case 'VariableStatement':
        return yield* Evaluate_VariableStatement(node);

      case 'EmptyStatement':
        return Evaluate_EmptyStatement();

      case 'IfStatement':
        return yield* Evaluate_IfStatement(node);

      case 'ExpressionStatement':
        return yield* Evaluate_ExpressionStatement(node);

      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'SwitchStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'ForAwaitStatement':
        return yield* Evaluate_BreakableStatement(node);

      case 'ForBinding':
        return Evaluate_ForBinding(node);

      case 'CaseClause':
      case 'DefaultClause':
        return yield* Evaluate_CaseClause(node);

      case 'BreakStatement':
        return Evaluate_BreakStatement(node);

      case 'ContinueStatement':
        return Evaluate_ContinueStatement(node);

      case 'LabelledStatement':
        return yield* Evaluate_LabelledStatement(node);

      case 'ReturnStatement':
        return yield* Evaluate_ReturnStatement(node);

      case 'ThrowStatement':
        return yield* Evaluate_ThrowStatement(node);

      case 'TryStatement':
        return yield* Evaluate_TryStatement(node);

      case 'DebuggerStatement':
        return Evaluate_DebuggerStatement();

      case 'WithStatement':
        return yield* Evaluate_WithStatement(node);
      // Declarations

      case 'ImportDeclaration':
        return Evaluate_ImportDeclaration();

      case 'ExportDeclaration':
        return yield* Evaluate_ExportDeclaration(node);

      case 'ClassDeclaration':
        return yield* Evaluate_ClassDeclaration(node);

      case 'LexicalDeclaration':
        return yield* Evaluate_LexicalDeclaration(node);

      case 'FunctionDeclaration':
        return Evaluate_FunctionDeclaration();

      case 'GeneratorDeclaration':
      case 'AsyncFunctionDeclaration':
      case 'AsyncGeneratorDeclaration':
        return Evaluate_HoistableDeclaration();
      // Expressions

      case 'CommaOperator':
        return yield* Evaluate_CommaOperator(node);

      case 'ThisExpression':
        return Evaluate_This();

      case 'IdentifierReference':
        return Evaluate_IdentifierReference(node);

      case 'NullLiteral':
      case 'BooleanLiteral':
      case 'NumericLiteral':
      case 'StringLiteral':
        return Evaluate_Literal(node);

      case 'ArrayLiteral':
        return yield* Evaluate_ArrayLiteral(node);

      case 'ObjectLiteral':
        return yield* Evaluate_ObjectLiteral(node);

      case 'FunctionExpression':
        return yield* Evaluate_FunctionExpression(node);

      case 'ClassExpression':
        return yield* Evaluate_ClassExpression(node);

      case 'GeneratorExpression':
        return yield* Evaluate_GeneratorExpression(node);

      case 'AsyncFunctionExpression':
        return yield* Evaluate_AsyncFunctionExpression(node);

      case 'AsyncGeneratorExpression':
        return yield* Evaluate_AsyncGeneratorExpression(node);

      case 'TemplateLiteral':
        return yield* Evaluate_TemplateLiteral(node);

      case 'ParenthesizedExpression':
        return yield* Evaluate_ParenthesizedExpression(node);

      case 'AdditiveExpression':
        return yield* Evaluate_AdditiveExpression(node);

      case 'MultiplicativeExpression':
        return yield* Evaluate_MultiplicativeExpression(node);

      case 'ExponentiationExpression':
        return yield* Evaluate_ExponentiationExpression(node);

      case 'UpdateExpression':
        return yield* Evaluate_UpdateExpression(node);

      case 'ShiftExpression':
        return yield* Evaluate_ShiftExpression(node);

      case 'LogicalORExpression':
        return yield* Evaluate_LogicalORExpression(node);

      case 'LogicalANDExpression':
        return yield* Evaluate_LogicalANDExpression(node);

      case 'BitwiseANDExpression':
      case 'BitwiseXORExpression':
      case 'BitwiseORExpression':
        return yield* Evaluate_BinaryBitwiseExpression(node);

      case 'RelationalExpression':
        return yield* Evaluate_RelationalExpression(node);

      case 'CoalesceExpression':
        return yield* Evaluate_CoalesceExpression(node);

      case 'EqualityExpression':
        return yield* Evaluate_EqualityExpression(node);

      case 'CallExpression':
        return yield* Evaluate_CallExpression(node);

      case 'NewExpression':
        return yield* Evaluate_NewExpression(node);

      case 'MemberExpression':
        return yield* Evaluate_MemberExpression(node);

      case 'OptionalExpression':
        return yield* Evaluate_OptionalExpression(node);

      case 'TaggedTemplateExpression':
        return yield* Evaluate_TaggedTemplateExpression(node);

      case 'SuperProperty':
        return yield* Evaluate_SuperProperty(node);

      case 'SuperCall':
        return yield* Evaluate_SuperCall(node);

      case 'NewTarget':
        return Evaluate_NewTarget();

      case 'ImportMeta':
        return Evaluate_ImportMeta();

      case 'ImportCall':
        return yield* Evaluate_ImportCall(node);

      case 'AssignmentExpression':
        return yield* Evaluate_AssignmentExpression(node);

      case 'YieldExpression':
        return yield* Evaluate_YieldExpression(node);

      case 'AwaitExpression':
        return yield* Evaluate_AwaitExpression(node);

      case 'UnaryExpression':
        return yield* Evaluate_UnaryExpression(node);

      case 'ArrowFunction':
        return yield* Evaluate_ArrowFunction(node);

      case 'AsyncArrowFunction':
        return yield* Evaluate_AsyncArrowFunction(node);

      case 'ConditionalExpression':
        return yield* Evaluate_ConditionalExpression(node);

      case 'RegularExpressionLiteral':
        return Evaluate_RegularExpressionLiteral(node);

      case 'AsyncFunctionBody':
      case 'GeneratorBody':
      case 'AsyncGeneratorBody':
        return yield* Evaluate_AnyFunctionBody(node);

      case 'ExpressionBody':
        return yield* Evaluate_ExpressionBody(node);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate', node);
    }
  }

  function i(V) {
    if (V instanceof Value) {
      return inspect(V, exports.surroundingAgent.currentRealmRecord);
    }

    return `${V}`;
  }

  const Raw = s => s;
  const AlreadyDeclared = n => `${i(n)} is already declared`;
  const ArrayBufferDetached = () => 'Attempt to access detached ArrayBuffer';
  const ArrayBufferShared = () => 'Attempt to access shared ArrayBuffer';
  const ArrayPastSafeLength = () => 'Cannot make length of array-like object surpass the bounds of an integer index';
  const ArrayEmptyReduce = () => 'Cannot reduce an empty array with no initial value';
  const AssignmentToConstant = n => `Assignment to constant variable ${i(n)}`;
  const AwaitInFormalParameters = () => 'await is not allowed in function parameters';
  const AwaitNotInAsyncFunction = () => 'await is only valid in async functions';
  const BigIntDivideByZero = () => 'Division by zero';
  const BigIntNegativeExponent = () => 'Exponent must be positive';
  const BigIntUnsignedRightShift = () => 'BigInt has no unsigned right shift, use >> instead';
  const BufferContentTypeMismatch = () => 'Newly created TypedArray did not match exemplar\'s content type';
  const BufferDetachKeyMismatch = (k, b) => `${i(k)} is not the [[ArrayBufferDetachKey]] of ${i(b)}`;
  const CannotAllocateDataBlock = () => 'Cannot allocate memory';
  const CannotCreateProxyWith = (x, y) => `Cannot create a proxy with a ${x} as ${y}`;
  const CannotConvertDecimalToBigInt = n => `Cannot convert ${i(n)} to a BigInt because it is not an integer`;
  const CannotConvertSymbol = t => `Cannot convert a Symbol value to a ${t}`;
  const CannotConvertToBigInt = v => `Cannot convert ${i(v)} to a BigInt`;
  const CannotConvertToObject = t => `Cannot convert ${t} to object`;
  const CannotDefineProperty = p => `Cannot define property ${i(p)}`;
  const CannotDeleteProperty = p => `Cannot delete property ${i(p)}`;
  const CannotDeleteSuper = () => 'Cannot delete a super property';
  const CannotJSONSerializeBigInt = () => 'Cannot serialize a BigInt to JSON';
  const CannotMixBigInts = () => 'Cannot mix BigInt and other types, use explicit conversions';
  const CannotResolvePromiseWithItself = () => 'Cannot resolve a promise with itself';
  const CannotSetProperty = (p, o) => `Cannot set property ${i(p)} on ${i(o)}`;
  const ClassMissingBindingIdentifier = () => 'Class declaration missing binding identifier';
  const ConstDeclarationMissingInitializer = () => 'Missing initialization of const declaration';
  const ConstructorNonCallable = f => `${i(f)} cannot be invoked without new`;
  const CouldNotResolveModule = s => `Could not resolve module ${i(s)}`;
  const DataViewOOB = () => 'Offset is outside the bounds of the DataView';
  const DeleteIdentifier = () => 'Delete of identifier in strict mode';
  const DateInvalidTime = () => 'Invalid time';
  const DerivedConstructorReturnedNonObject = () => 'Derived constructors may only return object or undefined';
  const DuplicateConstructor = () => 'A class may only have one constructor';
  const DuplicateExports = () => 'Module cannot contain duplicate exports';
  const DuplicateProto = () => 'An object literal may only have one __proto__ property';
  const FunctionDeclarationStatement = () => 'Functions can only be declared at top level or inside a block';
  const GeneratorRunning = () => 'Cannot manipulate a running generator';
  const IllegalBreakContinue = isBreak => `Illegal ${isBreak ? 'break' : 'continue'} statement`;
  const IllegalOctalEscape = () => 'Illegal octal escape';
  const InternalSlotMissing = (o, s) => `Internal slot ${s} is missing for ${i(o)}`;
  const InvalidArrayLength = l => `Invalid array length: ${i(l)}`;
  const InvalidAssignmentTarget = () => 'Invalid assignment target';
  const InvalidCodePoint = () => 'Not a valid code point';
  const InvalidHint = v => `Invalid hint: ${i(v)}`;
  const InvalidMethodName = name => `Method cannot be named '${i(name)}'`;
  const InvalidPropertyDescriptor = () => 'Invalid property descriptor. Cannot both specify accessors and a value or writable attribute';
  const InvalidRadix = () => 'Radix must be between 2 and 36, inclusive';
  const InvalidReceiver = (f, v) => `${f} called on invalid receiver: ${i(v)}`;
  const InvalidRegExpFlags = f => `Invalid RegExp flags: ${f}`;
  const InvalidSuperCall = () => '`super` not expected here';
  const InvalidSuperProperty = () => '`super` not expected here';
  const InvalidTemplateEscape = () => 'Invalid escapes are only allowed in tagged templates';
  const InvalidThis = () => 'Invalid `this` access';
  const InvalidUnicodeEscape = () => 'Invalid unicode escape';
  const IteratorThrowMissing = () => 'The iterator does not provide a throw method';
  const JSONCircular = () => 'Cannot JSON stringify a circular structure';
  const JSONUnexpectedToken = () => 'Unexpected token in JSON';
  const JSONUnexpectedChar = c => `Unexpected character ${c} in JSON`;
  const JSONExpected = (e, a) => `Expected character ${e} but got ${a} in JSON`;
  const LetInLexicalBinding = () => '\'let\' is not allowed to be used as a name in lexical declarations';
  const ModuleExportNameInvalidUnicode = () => 'Export name is not valid unicode';
  const ModuleUndefinedExport = n => `Export '${i(n)}' is not defined in module`;
  const NegativeIndex = n => `${n} cannot be negative`;
  const NewlineAfterThrow = () => 'Illegal newline after throw';
  const NormalizeInvalidForm = () => 'Invalid normalization form';
  const NotAConstructor = v => `${i(v)} is not a constructor`;
  const NotAFunction = v => `${i(v)} is not a function`;
  const NotATypeObject = (t, v) => `${i(v)} is not a ${t} object`;
  const NotAnObject = v => `${i(v)} is not an object`;
  const NotASymbol = v => `${i(v)} is not a symbol`;
  const NotDefined = n => `${i(n)} is not defined`;
  const NotInitialized = n => `${i(n)} cannot be used before initialization`;
  const NotPropertyName = p => `${i(p)} is not a valid property name`;
  const NumberFormatRange = m => `Invalid format range for ${m}`;
  const ObjectToPrimitive = () => 'Cannot convert object to primitive value';
  const ObjectPrototypeType = () => 'Object prototype must be an Object or null';
  const ObjectSetPrototype = () => 'Could not set prototype of object';
  const OutOfRange$1 = n => `${n} is out of range`;
  const PromiseAnyRejected = () => 'No promises passed to Promise.any were fulfilled';
  const PromiseCapabilityFunctionAlreadySet = f => `Promise ${f} function already set`;
  const PromiseRejectFunction = v => `Promise reject function ${i(v)} is not callable`;
  const PromiseResolveFunction = v => `Promise resolve function ${i(v)} is not callable`;
  const ProxyRevoked = n => `Cannot perform '${n}' on a proxy that has been revoked`;
  const ProxyDefinePropertyNonConfigurable = p => `'defineProperty' on proxy: trap returned truish for defining non-configurable property ${i(p)} which is either non-existent or configurable in the proxy target`;
  const ProxyDefinePropertyNonConfigurableWritable = p => `'defineProperty' on proxy: trap returned truish for defining non-configurable property ${i(p)} which cannot be non-writable, unless there exists a corresponding non-configurable, non-writable own property of the target object`;
  const ProxyDefinePropertyNonExtensible = p => `'defineProperty' on proxy: trap returned truish for adding property ${i(p)} to the non-extensible proxy target`;
  const ProxyDefinePropertyIncompatible = p => `'defineProperty' on proxy: trap returned truish for adding property ${i(p)} that is incompatible with the existing property in the proxy target`;
  const ProxyDeletePropertyNonConfigurable = p => `'deleteProperty' on proxy: trap returned truthy for property ${i(p)} which is non-configurable in the proxy target`;
  const ProxyDeletePropertyNonExtensible = p => `'deleteProperty' on proxy: trap returned truthy for property ${i(p)} but the proxy target is non-extensible`;
  const ProxyGetNonConfigurableData = p => `'get' on proxy: property ${i(p)} is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value`;
  const ProxyGetNonConfigurableAccessor = p => `'get' on proxy: property ${i(p)} is a non-configurable accessor property on the proxy target and does not have a getter function, but the trap did not return 'undefined'`;
  const ProxyGetPrototypeOfInvalid = () => '\'getPrototypeOf\' on proxy: trap returned neither object nor null';
  const ProxyGetPrototypeOfNonExtensible = () => '\'getPrototypeOf\' on proxy: proxy target is non-extensible but the trap did not return its actual prototype';
  const ProxyGetOwnPropertyDescriptorIncompatible = p => `'getOwnPropertyDescriptor' on proxy: trap returned descriptor for property ${i(p)} that is incompatible with the existing property in the proxy target`;
  const ProxyGetOwnPropertyDescriptorInvalid = p => `'getOwnPropertyDescriptor' on proxy: trap returned neither object nor undefined for property ${i(p)}`;
  const ProxyGetOwnPropertyDescriptorUndefined = p => `'getOwnPropertyDescriptor' on proxy: trap returned undefined for property ${i(p)} which is non-configurable in the proxy target`;
  const ProxyGetOwnPropertyDescriptorNonExtensible = p => `'getOwnPropertyDescriptor' on proxy: trap returned undefined for property ${i(p)} which exists in the non-extensible target`;
  const ProxyGetOwnPropertyDescriptorNonConfigurable = p => `'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property ${i(p)} which is either non-existent or configurable in the proxy target`;
  const ProxyGetOwnPropertyDescriptorNonConfigurableWritable = p => `'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property ${i(p)} which is writable or configurable in the proxy target`;
  const ProxyHasNonConfigurable = p => `'has' on proxy: trap returned falsy for property ${i(p)} which exists in the proxy target as non-configurable`;
  const ProxyHasNonExtensible = p => `'has' on proxy: trap returned falsy for property ${i(p)} but the proxy target is not extensible`;
  const ProxyIsExtensibleInconsistent = e => `'isExtensible' on proxy: trap result does not reflect extensibility of proxy target (which is ${i(e)})`;
  const ProxyOwnKeysMissing = p => `'ownKeys' on proxy: trap result did not include ${i(p)}`;
  const ProxyOwnKeysNonExtensible = () => '\'ownKeys\' on proxy: trap result returned extra keys but proxy target is non-extensible';
  const ProxyOwnKeysDuplicateEntries = () => '\'ownKeys\' on proxy: trap returned duplicate entries';
  const ProxyPreventExtensionsExtensible = () => '\'preventExtensions\' on proxy: trap returned truthy but the proxy target is extensible';
  const ProxySetPrototypeOfNonExtensible = () => '\'setPrototypeOf\' on proxy: trap returned truthy for setting a new prototype on the non-extensible proxy target';
  const ProxySetFrozenData = p => `'set' on proxy: trap returned truthy for property ${i(p)} which exists in the proxy target as a non-configurable and non-writable data property with a different value`;
  const ProxySetFrozenAccessor = p => `'set' on proxy: trap returned truish for property ${i(p)} which exists in the proxy target as a non-configurable and non-writable accessor property without a setter`;
  const RegExpArgumentNotAllowed = m => `First argument to ${m} must not be a regular expression`;
  const RegExpExecNotObject = o => `${i(o)} is not object or null`;
  const ResolutionNullOrAmbiguous = (r, n, m) => r === null ? `Could not resolve import ${i(n)} from ${m.HostDefined.specifier}` : `Star export ${i(n)} from ${m.HostDefined.specifier} is ambiguous`;
  const SpeciesNotConstructor = () => 'object.constructor[Symbol.species] is not a constructor';
  const StrictModeDelete = n => `Cannot not delete property ${i(n)}`;
  const StrictPoisonPill = () => 'The caller, callee, and arguments properties may not be accessed on functions or the arguments objects for calls to them';
  const StringRepeatCount = v => `Count ${i(v)} is invalid`;
  const StringCodePointInvalid = n => `Invalid code point ${i(n)}`;
  const StringPrototypeMethodGlobalRegExp = m => `The RegExp passed to String.prototype.${m} must have the global flag`;
  const SubclassLengthTooSmall = v => `Subclass constructor returned a smaller-than-requested object ${i(v)}`;
  const SubclassSameValue = v => `Subclass constructor returned the same object ${i(v)}`;
  const TargetMatchesHeldValue = v => `heldValue ${i(v)} matches target`;
  const TemplateInOptionalChain = () => 'Templates are not allowed in optional chains';
  const TryMissingCatchOrFinally = () => 'Missing catch or finally after try';
  const TypedArrayCreationOOB = () => 'Sum of start offset and byte length should be less than the size of underlying buffer';
  const TypedArrayLengthAlignment = (n, m) => `Size of ${n} should be a multiple of ${m}`;
  const TypedArrayOOB = () => 'Sum of start offset and byte length should be less than the size of the TypedArray';
  const TypedArrayOffsetAlignment = (n, m) => `Start offset of ${n} should be a multiple of ${m}`;
  const TypedArrayTooSmall = () => 'Derived TypedArray constructor created an array which was too small';
  const UnableToSeal = o => `Unable to seal object ${i(o)}`;
  const UnableToFreeze = o => `Unable to freeze object ${i(o)}`;
  const UnableToPreventExtensions = o => `Unable to prevent extensions on object ${i(o)}`;
  const UnterminatedComment = () => 'Missing */ after comment';
  const UnterminatedRegExp = () => 'Missing / after RegExp literal';
  const UnterminatedString = () => 'Missing \' or " after string literal';
  const UnterminatedTemplate = () => 'Missing ` after template literal';
  const UnexpectedEOS = () => 'Unexpected end of source';
  const UnexpectedEvalOrArguments = () => '`arguments` and `eval` are not valid in this context';
  const UnexpectedToken = () => 'Unexpected token';
  const UnexpectedReservedWordStrict = () => 'Unexpected reserved word in strict mode';
  const UseStrictNonSimpleParameter = () => 'Function with \'use strict\' directive has non-simple parameter list';
  const URIMalformed = () => 'URI malformed';
  const WeakCollectionNotObject = v => `${i(v)} is not a valid weak collectection entry object`;
  const YieldInFormalParameters = () => 'yield is not allowed in function parameters';
  const YieldNotInGenerator = () => 'yield is only valid in generators';

  var messages = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Raw: Raw,
    AlreadyDeclared: AlreadyDeclared,
    ArrayBufferDetached: ArrayBufferDetached,
    ArrayBufferShared: ArrayBufferShared,
    ArrayPastSafeLength: ArrayPastSafeLength,
    ArrayEmptyReduce: ArrayEmptyReduce,
    AssignmentToConstant: AssignmentToConstant,
    AwaitInFormalParameters: AwaitInFormalParameters,
    AwaitNotInAsyncFunction: AwaitNotInAsyncFunction,
    BigIntDivideByZero: BigIntDivideByZero,
    BigIntNegativeExponent: BigIntNegativeExponent,
    BigIntUnsignedRightShift: BigIntUnsignedRightShift,
    BufferContentTypeMismatch: BufferContentTypeMismatch,
    BufferDetachKeyMismatch: BufferDetachKeyMismatch,
    CannotAllocateDataBlock: CannotAllocateDataBlock,
    CannotCreateProxyWith: CannotCreateProxyWith,
    CannotConvertDecimalToBigInt: CannotConvertDecimalToBigInt,
    CannotConvertSymbol: CannotConvertSymbol,
    CannotConvertToBigInt: CannotConvertToBigInt,
    CannotConvertToObject: CannotConvertToObject,
    CannotDefineProperty: CannotDefineProperty,
    CannotDeleteProperty: CannotDeleteProperty,
    CannotDeleteSuper: CannotDeleteSuper,
    CannotJSONSerializeBigInt: CannotJSONSerializeBigInt,
    CannotMixBigInts: CannotMixBigInts,
    CannotResolvePromiseWithItself: CannotResolvePromiseWithItself,
    CannotSetProperty: CannotSetProperty,
    ClassMissingBindingIdentifier: ClassMissingBindingIdentifier,
    ConstDeclarationMissingInitializer: ConstDeclarationMissingInitializer,
    ConstructorNonCallable: ConstructorNonCallable,
    CouldNotResolveModule: CouldNotResolveModule,
    DataViewOOB: DataViewOOB,
    DeleteIdentifier: DeleteIdentifier,
    DateInvalidTime: DateInvalidTime,
    DerivedConstructorReturnedNonObject: DerivedConstructorReturnedNonObject,
    DuplicateConstructor: DuplicateConstructor,
    DuplicateExports: DuplicateExports,
    DuplicateProto: DuplicateProto,
    FunctionDeclarationStatement: FunctionDeclarationStatement,
    GeneratorRunning: GeneratorRunning,
    IllegalBreakContinue: IllegalBreakContinue,
    IllegalOctalEscape: IllegalOctalEscape,
    InternalSlotMissing: InternalSlotMissing,
    InvalidArrayLength: InvalidArrayLength,
    InvalidAssignmentTarget: InvalidAssignmentTarget,
    InvalidCodePoint: InvalidCodePoint,
    InvalidHint: InvalidHint,
    InvalidMethodName: InvalidMethodName,
    InvalidPropertyDescriptor: InvalidPropertyDescriptor,
    InvalidRadix: InvalidRadix,
    InvalidReceiver: InvalidReceiver,
    InvalidRegExpFlags: InvalidRegExpFlags,
    InvalidSuperCall: InvalidSuperCall,
    InvalidSuperProperty: InvalidSuperProperty,
    InvalidTemplateEscape: InvalidTemplateEscape,
    InvalidThis: InvalidThis,
    InvalidUnicodeEscape: InvalidUnicodeEscape,
    IteratorThrowMissing: IteratorThrowMissing,
    JSONCircular: JSONCircular,
    JSONUnexpectedToken: JSONUnexpectedToken,
    JSONUnexpectedChar: JSONUnexpectedChar,
    JSONExpected: JSONExpected,
    LetInLexicalBinding: LetInLexicalBinding,
    ModuleExportNameInvalidUnicode: ModuleExportNameInvalidUnicode,
    ModuleUndefinedExport: ModuleUndefinedExport,
    NegativeIndex: NegativeIndex,
    NewlineAfterThrow: NewlineAfterThrow,
    NormalizeInvalidForm: NormalizeInvalidForm,
    NotAConstructor: NotAConstructor,
    NotAFunction: NotAFunction,
    NotATypeObject: NotATypeObject,
    NotAnObject: NotAnObject,
    NotASymbol: NotASymbol,
    NotDefined: NotDefined,
    NotInitialized: NotInitialized,
    NotPropertyName: NotPropertyName,
    NumberFormatRange: NumberFormatRange,
    ObjectToPrimitive: ObjectToPrimitive,
    ObjectPrototypeType: ObjectPrototypeType,
    ObjectSetPrototype: ObjectSetPrototype,
    OutOfRange: OutOfRange$1,
    PromiseAnyRejected: PromiseAnyRejected,
    PromiseCapabilityFunctionAlreadySet: PromiseCapabilityFunctionAlreadySet,
    PromiseRejectFunction: PromiseRejectFunction,
    PromiseResolveFunction: PromiseResolveFunction,
    ProxyRevoked: ProxyRevoked,
    ProxyDefinePropertyNonConfigurable: ProxyDefinePropertyNonConfigurable,
    ProxyDefinePropertyNonConfigurableWritable: ProxyDefinePropertyNonConfigurableWritable,
    ProxyDefinePropertyNonExtensible: ProxyDefinePropertyNonExtensible,
    ProxyDefinePropertyIncompatible: ProxyDefinePropertyIncompatible,
    ProxyDeletePropertyNonConfigurable: ProxyDeletePropertyNonConfigurable,
    ProxyDeletePropertyNonExtensible: ProxyDeletePropertyNonExtensible,
    ProxyGetNonConfigurableData: ProxyGetNonConfigurableData,
    ProxyGetNonConfigurableAccessor: ProxyGetNonConfigurableAccessor,
    ProxyGetPrototypeOfInvalid: ProxyGetPrototypeOfInvalid,
    ProxyGetPrototypeOfNonExtensible: ProxyGetPrototypeOfNonExtensible,
    ProxyGetOwnPropertyDescriptorIncompatible: ProxyGetOwnPropertyDescriptorIncompatible,
    ProxyGetOwnPropertyDescriptorInvalid: ProxyGetOwnPropertyDescriptorInvalid,
    ProxyGetOwnPropertyDescriptorUndefined: ProxyGetOwnPropertyDescriptorUndefined,
    ProxyGetOwnPropertyDescriptorNonExtensible: ProxyGetOwnPropertyDescriptorNonExtensible,
    ProxyGetOwnPropertyDescriptorNonConfigurable: ProxyGetOwnPropertyDescriptorNonConfigurable,
    ProxyGetOwnPropertyDescriptorNonConfigurableWritable: ProxyGetOwnPropertyDescriptorNonConfigurableWritable,
    ProxyHasNonConfigurable: ProxyHasNonConfigurable,
    ProxyHasNonExtensible: ProxyHasNonExtensible,
    ProxyIsExtensibleInconsistent: ProxyIsExtensibleInconsistent,
    ProxyOwnKeysMissing: ProxyOwnKeysMissing,
    ProxyOwnKeysNonExtensible: ProxyOwnKeysNonExtensible,
    ProxyOwnKeysDuplicateEntries: ProxyOwnKeysDuplicateEntries,
    ProxyPreventExtensionsExtensible: ProxyPreventExtensionsExtensible,
    ProxySetPrototypeOfNonExtensible: ProxySetPrototypeOfNonExtensible,
    ProxySetFrozenData: ProxySetFrozenData,
    ProxySetFrozenAccessor: ProxySetFrozenAccessor,
    RegExpArgumentNotAllowed: RegExpArgumentNotAllowed,
    RegExpExecNotObject: RegExpExecNotObject,
    ResolutionNullOrAmbiguous: ResolutionNullOrAmbiguous,
    SpeciesNotConstructor: SpeciesNotConstructor,
    StrictModeDelete: StrictModeDelete,
    StrictPoisonPill: StrictPoisonPill,
    StringRepeatCount: StringRepeatCount,
    StringCodePointInvalid: StringCodePointInvalid,
    StringPrototypeMethodGlobalRegExp: StringPrototypeMethodGlobalRegExp,
    SubclassLengthTooSmall: SubclassLengthTooSmall,
    SubclassSameValue: SubclassSameValue,
    TargetMatchesHeldValue: TargetMatchesHeldValue,
    TemplateInOptionalChain: TemplateInOptionalChain,
    TryMissingCatchOrFinally: TryMissingCatchOrFinally,
    TypedArrayCreationOOB: TypedArrayCreationOOB,
    TypedArrayLengthAlignment: TypedArrayLengthAlignment,
    TypedArrayOOB: TypedArrayOOB,
    TypedArrayOffsetAlignment: TypedArrayOffsetAlignment,
    TypedArrayTooSmall: TypedArrayTooSmall,
    UnableToSeal: UnableToSeal,
    UnableToFreeze: UnableToFreeze,
    UnableToPreventExtensions: UnableToPreventExtensions,
    UnterminatedComment: UnterminatedComment,
    UnterminatedRegExp: UnterminatedRegExp,
    UnterminatedString: UnterminatedString,
    UnterminatedTemplate: UnterminatedTemplate,
    UnexpectedEOS: UnexpectedEOS,
    UnexpectedEvalOrArguments: UnexpectedEvalOrArguments,
    UnexpectedToken: UnexpectedToken,
    UnexpectedReservedWordStrict: UnexpectedReservedWordStrict,
    UseStrictNonSimpleParameter: UseStrictNonSimpleParameter,
    URIMalformed: URIMalformed,
    WeakCollectionNotObject: WeakCollectionNotObject,
    YieldInFormalParameters: YieldInFormalParameters,
    YieldNotInGenerator: YieldNotInGenerator
  });

  const Flag = {
    __proto__: null
  };
  ['return', 'await', 'yield', 'parameters', 'newTarget', 'importMeta', 'superCall', 'superProperty', 'in', 'default', 'module'].forEach((name, i) => {
    /* istanbul ignore next */
    if (i > 31) {
      throw new RangeError(name);
    }

    Flag[name] = 1 << i;
  });
  function getDeclarations(node) {
    if (Array.isArray(node)) {
      return node.flatMap(n => getDeclarations(n));
    }

    switch (node.type) {
      case 'LexicalBinding':
      case 'VariableDeclaration':
      case 'BindingRestElement':
      case 'BindingRestProperty':
      case 'ForBinding':
        if (node.BindingIdentifier) {
          return getDeclarations(node.BindingIdentifier);
        }

        if (node.BindingPattern) {
          return getDeclarations(node.BindingPattern);
        }

        return [];

      case 'SingleNameBinding':
        return getDeclarations(node.BindingIdentifier);

      case 'ImportClause':
        {
          const d = [];

          if (node.ImportedDefaultBinding) {
            d.push(...getDeclarations(node.ImportedDefaultBinding));
          }

          if (node.NameSpaceImport) {
            d.push(...getDeclarations(node.NameSpaceImport));
          }

          if (node.NamedImports) {
            d.push(...getDeclarations(node.NamedImports));
          }

          return d;
        }

      case 'ImportSpecifier':
        return getDeclarations(node.ImportedBinding);

      case 'ImportedDefaultBinding':
      case 'NameSpaceImport':
        return getDeclarations(node.ImportedBinding);

      case 'NamedImports':
        return getDeclarations(node.ImportsList);

      case 'ObjectBindingPattern':
        {
          const declarations = getDeclarations(node.BindingPropertyList);

          if (node.BindingRestProperty) {
            declarations.push(...getDeclarations(node.BindingRestProperty));
          }

          return declarations;
        }

      case 'ArrayBindingPattern':
        {
          const declarations = getDeclarations(node.BindingElementList);

          if (node.BindingRestElement) {
            declarations.push(...getDeclarations(node.BindingRestElement));
          }

          return declarations;
        }

      case 'BindingElement':
        return getDeclarations(node.BindingPattern);

      case 'BindingProperty':
        return getDeclarations(node.BindingElement);

      case 'BindingIdentifier':
      case 'IdentifierName':
      case 'LabelIdentifier':
        return [{
          name: node.name,
          node
        }];

      case 'StringLiteral':
        return [{
          name: node.value,
          node
        }];

      case 'Elision':
        return [];

      case 'ForDeclaration':
        return getDeclarations(node.ForBinding);

      case 'ExportSpecifier':
        return getDeclarations(node.exportName);

      case 'FunctionDeclaration':
      case 'GeneratorDeclaration':
      case 'AsyncFunctionDeclaration':
      case 'AsyncGeneratorDeclaration':
        return getDeclarations(node.BindingIdentifier);

      case 'LexicalDeclaration':
        return getDeclarations(node.BindingList);

      case 'VariableStatement':
        return getDeclarations(node.VariableDeclarationList);

      case 'ClassDeclaration':
        return getDeclarations(node.BindingIdentifier);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('getDeclarations', node);
    }
  }
  class Scope {
    constructor(parser) {
      this.parser = parser;
      this.scopeStack = [];
      this.labels = [];
      this.arrowInfoStack = [];
      this.assignmentInfoStack = [];
      this.exports = new Set();
      this.undefinedExports = new Map();
      this.flags = 0;
    }

    hasReturn() {
      return (this.flags & Flag.return) !== 0;
    }

    hasAwait() {
      return (this.flags & Flag.await) !== 0;
    }

    hasYield() {
      return (this.flags & Flag.yield) !== 0;
    }

    hasNewTarget() {
      return (this.flags & Flag.newTarget) !== 0;
    }

    hasSuperCall() {
      return (this.flags & Flag.superCall) !== 0;
    }

    hasSuperProperty() {
      return (this.flags & Flag.superProperty) !== 0;
    }

    hasImportMeta() {
      return (this.flags & Flag.importMeta) !== 0;
    }

    hasIn() {
      return (this.flags & Flag.in) !== 0;
    }

    inParameters() {
      return (this.flags & Flag.parameters) !== 0;
    }

    isDefault() {
      return (this.flags & Flag.default) !== 0;
    }

    isModule() {
      return (this.flags & Flag.module) !== 0;
    }

    with(flags, f) {
      const oldFlags = this.flags;
      Object.entries(flags).forEach(([k, v]) => {
        if (k in Flag) {
          if (v === true) {
            this.flags |= Flag[k];
          } else if (v === false) {
            this.flags &= ~Flag[k];
          }
        }
      });

      if (flags.lexical || flags.variable) {
        this.scopeStack.push({
          flags,
          lexicals: new Set(),
          variables: new Set(),
          functions: new Set(),
          parameters: new Set()
        });
      }

      const oldLabels = this.labels;

      if (flags.label === 'boundary') {
        this.labels = [];
      } else if (flags.label) {
        this.labels.push({
          type: flags.label
        });
      }

      const oldStrict = this.parser.state.strict;

      if (flags.strict === true) {
        this.parser.state.strict = true;
      } else if (flags.strict === false) {
        this.parser.state.strict = false;
      }

      const r = f();

      if (flags.label === 'boundary') {
        this.labels = oldLabels;
      } else if (flags.label) {
        this.labels.pop();
      }

      if (flags.lexical || flags.variable) {
        this.scopeStack.pop();
      }

      this.parser.state.strict = oldStrict;
      this.flags = oldFlags;
      return r;
    }

    pushArrowInfo(isAsync = false) {
      this.arrowInfoStack.push({
        isAsync,
        hasTrailingComma: false,
        yieldExpressions: [],
        awaitExpressions: [],
        awaitIdentifiers: []
      });
    }

    popArrowInfo() {
      return this.arrowInfoStack.pop();
    }

    pushAssignmentInfo(type) {
      const parser = this.parser;
      this.assignmentInfoStack.push({
        type,
        earlyErrors: [],

        clear() {
          this.earlyErrors.forEach(e => {
            parser.earlyErrors.delete(e);
          });
        }

      });
    }

    popAssignmentInfo() {
      return this.assignmentInfoStack.pop();
    }

    registerObjectLiteralEarlyError(error) {
      for (let i = this.assignmentInfoStack.length - 1; i >= 0; i -= 1) {
        const info = this.assignmentInfoStack[i];
        info.earlyErrors.push(error);

        if (info.type !== 'assign') {
          break;
        }
      }
    }

    lexicalScope() {
      for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
        const scope = this.scopeStack[i];

        if (scope.flags.lexical) {
          return scope;
        }
      }
      /* istanbul ignore next */


      throw new RangeError();
    }

    variableScope() {
      for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
        const scope = this.scopeStack[i];

        if (scope.flags.variable) {
          return scope;
        }
      }
      /* istanbul ignore next */


      throw new RangeError();
    }

    declare(node, type) {
      const declarations = getDeclarations(node);
      declarations.forEach(d => {
        switch (type) {
          case 'lexical':
          case 'import':
            {
              if (type === 'lexical' && d.name === 'let') {
                this.parser.raiseEarly('LetInLexicalBinding', d.node);
              }

              const scope = this.lexicalScope();

              if (scope.lexicals.has(d.name) || scope.variables.has(d.name) || scope.functions.has(d.name) || scope.parameters.has(d.name)) {
                this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
              }

              scope.lexicals.add(d.name);

              if (scope === this.scopeStack[0] && this.undefinedExports.has(d.name)) {
                this.undefinedExports.delete(d.name);
              }

              break;
            }

          case 'function':
            {
              const scope = this.lexicalScope();

              if (scope.lexicals.has(d.name)) {
                this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
              }

              if (scope.flags.variableFunctions) {
                scope.functions.add(d.name);
              } else {
                if (scope.variables.has(d.name)) {
                  this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
                }

                scope.lexicals.add(d.name);
              }

              if (scope === this.scopeStack[0] && this.undefinedExports.has(d.name)) {
                this.undefinedExports.delete(d.name);
              }

              break;
            }

          case 'parameter':
            this.variableScope().parameters.add(d.name);
            break;

          case 'variable':
            for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
              const scope = this.scopeStack[i];
              scope.variables.add(d.name);

              if (scope.lexicals.has(d.name) || !scope.flags.variableFunctions && scope.functions.has(d.name)) {
                this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
              }

              if (i === 0 && this.undefinedExports.has(d.name)) {
                this.undefinedExports.delete(d.name);
              }

              if (scope.flags.variable) {
                break;
              }
            }

            break;

          case 'export':
            if (this.exports.has(d.name)) {
              this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
            } else {
              this.exports.add(d.name);
            }

            break;

          default:
            /* istanbul ignore next */
            throw new RangeError(type);
        }
      });
    }

    checkUndefinedExports(NamedExports) {
      const scope = this.variableScope();
      NamedExports.ExportsList.forEach(n => {
        const name = n.localName.name || n.localName.value;

        if (!scope.lexicals.has(name) && !scope.variables.has(name)) {
          this.undefinedExports.set(name, n.localName);
        }
      });
    }

  }

  class BaseParser extends Lexer {}

  class IdentifierParser extends BaseParser {
    // IdentifierName
    parseIdentifierName() {
      const node = this.startNode();
      const p = this.peek();

      if (p.type === Token.IDENTIFIER || p.type === Token.ESCAPED_KEYWORD || isKeyword(p.type)) {
        node.name = this.next().value;
      } else {
        this.unexpected();
      }

      return this.finishNode(node, 'IdentifierName');
    } // BindingIdentifier :
    //   Identifier
    //   `yield`
    //   `await`


    parseBindingIdentifier() {
      const node = this.startNode();
      const token = this.next();

      switch (token.type) {
        case Token.IDENTIFIER:
          node.name = token.value;
          break;

        case Token.ESCAPED_KEYWORD:
          node.name = token.value;
          break;

        case Token.YIELD:
          node.name = 'yield';
          break;

        case Token.AWAIT:
          node.name = 'await';

          for (let i = 0; i < this.scope.arrowInfoStack.length; i += 1) {
            const arrowInfo = this.scope.arrowInfoStack[i];

            if (arrowInfo.isAsync) {
              arrowInfo.awaitIdentifiers.push(node);
              break;
            }
          }

          break;

        default:
          this.unexpected(token);
      }

      if (node.name === 'yield' && (this.scope.hasYield() || this.scope.isModule())) {
        this.raiseEarly('UnexpectedReservedWordStrict', token);
      }

      if (node.name === 'await' && (this.scope.hasAwait() || this.scope.isModule())) {
        this.raiseEarly('UnexpectedReservedWordStrict', token);
      }

      if (this.isStrictMode()) {
        if (isReservedWordStrict(node.name)) {
          this.raiseEarly('UnexpectedReservedWordStrict', token);
        }

        if (node.name === 'eval' || node.name === 'arguments') {
          this.raiseEarly('UnexpectedEvalOrArguments', token);
        }
      }

      if (node.name !== 'yield' && node.name !== 'await' && isKeywordRaw(node.name)) {
        this.raiseEarly('UnexpectedToken', token);
      }

      return this.finishNode(node, 'BindingIdentifier');
    } // IdentifierReference :
    //   Identifier
    //   [~Yield] `yield`
    //   [~Await] `await`


    parseIdentifierReference() {
      const node = this.startNode();
      const token = this.next();

      switch (token.type) {
        case Token.IDENTIFIER:
          node.name = token.value;
          break;

        case Token.ESCAPED_KEYWORD:
          node.name = token.value;
          break;

        case Token.YIELD:
          if (this.scope.hasYield()) {
            this.unexpected(token);
          }

          node.name = 'yield';
          break;

        case Token.AWAIT:
          if (this.scope.hasAwait()) {
            this.unexpected(token);
          }

          for (let i = 0; i < this.scope.arrowInfoStack.length; i += 1) {
            const arrowInfo = this.scope.arrowInfoStack[i];

            if (arrowInfo.isAsync) {
              arrowInfo.awaitIdentifiers.push(node);
              break;
            }
          }

          node.name = 'await';
          break;

        default:
          this.unexpected(token);
      }

      this.validateIdentifierReference(node.name, token);
      return this.finishNode(node, 'IdentifierReference');
    }

    validateIdentifierReference(name, token) {
      if (name === 'yield' && (this.scope.hasYield() || this.scope.isModule())) {
        this.raiseEarly('UnexpectedReservedWordStrict', token);
      }

      if (name === 'await' && (this.scope.hasAwait() || this.scope.isModule())) {
        this.raiseEarly('UnexpectedReservedWordStrict', token);
      }

      if (this.isStrictMode() && isReservedWordStrict(name)) {
        this.raiseEarly('UnexpectedReservedWordStrict', token);
      }

      if (name !== 'yield' && name !== 'await' && isKeywordRaw(name)) {
        this.raiseEarly('UnexpectedToken', token);
      }
    } // LabelIdentifier :
    //   Identifier
    //   [~Yield] `yield`
    //   [~Await] `await`


    parseLabelIdentifier() {
      const node = this.parseIdentifierReference();
      node.type = 'LabelIdentifier';
      return node;
    }

  }

  const FunctionKind = {
    NORMAL: 0,
    ASYNC: 1
  };
  class FunctionParser extends IdentifierParser {
    // FunctionDeclaration :
    //   `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
    //   [+Default] `function` `(` FormalParameters `)` `{` FunctionBody `}`
    // FunctionExpression :
    //   `function` BindingIdentifier? `(` FormalParameters `)` `{` FunctionBody `}`
    // GeneratorDeclaration :
    //   `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
    //   [+Default] `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
    // GeneratorExpression :
    //   `function` BindingIdentifier? `(` FormalParameters `)` `{` GeneratorBody `}`
    // AsyncGeneratorDeclaration :
    //   `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
    //   [+Default] `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
    // AsyncGeneratorExpression :
    //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
    // AsyncFunctionDeclaration :
    //   `async` `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
    //   [+Default] `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
    // Async`FunctionExpression :
    //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncFunctionBody `}`
    parseFunction(isExpression, kind) {
      const isAsync = kind === FunctionKind.ASYNC;
      const node = this.startNode();

      if (isAsync) {
        this.expect('async');
      }

      this.expect(Token.FUNCTION);
      const isGenerator = this.eat(Token.MUL);

      if (!this.test(Token.LPAREN)) {
        this.scope.with({
          await: isExpression ? false : undefined,
          yield: isExpression ? false : undefined
        }, () => {
          node.BindingIdentifier = this.parseBindingIdentifier();
        });

        if (!isExpression) {
          this.scope.declare(node.BindingIdentifier, 'function');
        }
      } else if (isExpression === false && !this.scope.isDefault()) {
        this.unexpected();
      } else {
        node.BindingIdentifier = null;
      }

      this.scope.with({
        default: false,
        await: isAsync,
        yield: isGenerator,
        lexical: true,
        variable: true,
        variableFunctions: true
      }, () => {
        node.FormalParameters = this.parseFormalParameters();
        const body = this.parseFunctionBody(isAsync, isGenerator, false);
        node[body.type] = body;

        if (node.BindingIdentifier) {
          if (body.strict && (node.BindingIdentifier.name === 'eval' || node.BindingIdentifier.name === 'arguments')) {
            this.raiseEarly('UnexpectedToken', node.BindingIdentifier);
          }

          if (isExpression) {
            if (this.scope.hasYield() && node.BindingIdentifier.name === 'yield') {
              this.raiseEarly('UnexpectedToken', node.BindingIdentifier);
            }

            if (this.scope.hasAwait() && node.BindingIdentifier.name === 'await') {
              this.raiseEarly('UnexpectedToken', node.BindingIdentifier);
            }
          }
        }

        this.validateFormalParameters(node.FormalParameters, body);
      });
      const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}${isExpression ? 'Expression' : 'Declaration'}`;
      return this.finishNode(node, name);
    }

    validateFormalParameters(parameters, body, wantsUnique = false) {
      const isStrict = body.strict;
      const hasStrictDirective = body.directives && body.directives.includes('use strict');

      if (wantsUnique === false && !IsSimpleParameterList(parameters)) {
        wantsUnique = true;
      }

      if (hasStrictDirective) {
        parameters.forEach(p => {
          if (p.type !== 'SingleNameBinding' || p.Initializer) {
            this.raiseEarly('UseStrictNonSimpleParameter', p);
          }
        });
      }

      const names = new Set();
      getDeclarations(parameters).forEach(d => {
        if (isStrict) {
          if (d.name === 'arguments' || d.name === 'eval') {
            this.raiseEarly('UnexpectedToken', d.node);
          }
        }

        if (isStrict || wantsUnique) {
          if (names.has(d.name)) {
            this.raiseEarly('AlreadyDeclared', d.node, d.name);
          } else {
            names.add(d.name);
          }
        }
      });
    }

    convertArrowParameter(node) {
      switch (node.type) {
        case 'IdentifierReference':
          {
            node.type = 'BindingIdentifier';
            const container = this.startNode();
            container.BindingIdentifier = node;
            container.Initializer = null;
            this.scope.declare(node, 'parameter');
            return this.finishNode(container, 'SingleNameBinding');
          }

        case 'BindingRestElement':
          this.scope.declare(node, 'parameter');
          return node;

        case 'Elision':
          return node;

        case 'ArrayLiteral':
          {
            const wrap = this.startNode();
            node.BindingElementList = [];
            node.ElementList.forEach((p, i) => {
              const c = this.convertArrowParameter(p);

              if (c.type === 'BindingRestElement') {
                if (i !== node.ElementList.length - 1) {
                  this.raiseEarly('UnexpectedToken', c);
                }

                node.BindingRestElement = c;
              } else {
                node.BindingElementList.push(c);
              }
            });
            delete node.ElementList;
            node.type = 'ArrayBindingPattern';
            wrap.BindingPattern = node;
            wrap.Initializer = null;
            return this.finishNode(wrap, 'BindingElement');
          }

        case 'ObjectLiteral':
          {
            const wrap = this.startNode();
            node.BindingPropertyList = [];
            node.PropertyDefinitionList.forEach(p => {
              const c = this.convertArrowParameter(p);

              if (c.type === 'BindingRestProperty') {
                node.BindingRestProperty = c;
              } else {
                node.BindingPropertyList.push(c);
              }
            });
            delete node.PropertyDefinitionList;
            node.type = 'ObjectBindingPattern';
            wrap.BindingPattern = node;
            wrap.Initializer = null;
            return this.finishNode(wrap, 'BindingElement');
          }

        case 'AssignmentExpression':
          {
            const result = this.convertArrowParameter(node.LeftHandSideExpression);
            result.Initializer = node.AssignmentExpression;
            return result;
          }

        case 'CoverInitializedName':
          node.type = 'SingleNameBinding';
          node.BindingIdentifier = node.IdentifierReference;
          node.BindingIdentifier.type = 'BindingIdentifier';
          delete node.IdentifierReference;
          this.scope.declare(node, 'parameter');
          return node;

        case 'PropertyDefinition':
          if (node.PropertyName === null) {
            node.type = 'BindingRestProperty';
            node.BindingIdentifier = node.AssignmentExpression;
            node.BindingIdentifier.type = 'BindingIdentifier';
          } else {
            node.type = 'BindingProperty';
            node.BindingElement = this.convertArrowParameter(node.AssignmentExpression);
          }

          this.scope.declare(node, 'parameter');
          delete node.AssignmentExpression;
          return node;

        case 'SpreadElement':
        case 'AssignmentRestElement':
          node.type = 'BindingRestElement';

          if (node.AssignmentExpression.type === 'AssignmentExpression') {
            this.raiseEarly('UnexpectedToken', node);
          } else if (node.AssignmentExpression.type === 'IdentifierReference') {
            node.BindingIdentifier = node.AssignmentExpression;
            node.BindingIdentifier.type = 'BindingIdentifier';
          } else {
            node.BindingPattern = this.convertArrowParameter(node.AssignmentExpression).BindingPattern;
          }

          this.scope.declare(node, 'parameter');
          delete node.AssignmentExpression;
          return node;

        default:
          this.raiseEarly('UnexpectedToken', node);
          return node;
      }
    }

    parseArrowFunction(node, {
      arrowInfo,
      Arguments
    }, kind) {
      const isAsync = kind === FunctionKind.ASYNC;
      this.expect(Token.ARROW);

      if (arrowInfo) {
        arrowInfo.awaitExpressions.forEach(e => {
          this.raiseEarly('AwaitInFormalParameters', e);
        });
        arrowInfo.yieldExpressions.forEach(e => {
          this.raiseEarly('YieldInFormalParameters', e);
        });

        if (isAsync) {
          arrowInfo.awaitIdentifiers.forEach(e => {
            this.raiseEarly('AwaitInFormalParameters', e);
          });
        }
      }

      this.scope.with({
        default: false,
        lexical: true,
        variable: true
      }, () => {
        this.scope.with({
          parameters: true
        }, () => {
          node.ArrowParameters = Arguments.map(p => this.convertArrowParameter(p));
        });
        const body = this.parseConciseBody(isAsync);
        this.validateFormalParameters(node.ArrowParameters, body, true);
        node[`${isAsync ? 'Async' : ''}ConciseBody`] = body;
      });
      return this.finishNode(node, `${isAsync ? 'Async' : ''}ArrowFunction`);
    }

    parseConciseBody(isAsync) {
      if (this.test(Token.LBRACE)) {
        return this.parseFunctionBody(isAsync, false, true);
      }

      const asyncBody = this.startNode();
      const exprBody = this.startNode();
      this.scope.with({
        await: isAsync
      }, () => {
        exprBody.AssignmentExpression = this.parseAssignmentExpression();
      });
      asyncBody.ExpressionBody = this.finishNode(exprBody, 'ExpressionBody');
      return this.finishNode(asyncBody, `${isAsync ? 'Async' : ''}ConciseBody`);
    } // FormalParameter : BindingElement


    parseFormalParameter() {
      return this.parseBindingElement();
    }

    parseFormalParameters() {
      this.expect(Token.LPAREN);

      if (this.eat(Token.RPAREN)) {
        return [];
      }

      const params = [];
      this.scope.with({
        parameters: true
      }, () => {
        while (true) {
          if (this.test(Token.ELLIPSIS)) {
            const element = this.parseBindingRestElement();
            this.scope.declare(element, 'parameter');
            params.push(element);
            this.expect(Token.RPAREN);
            break;
          } else {
            const formal = this.parseFormalParameter();
            this.scope.declare(formal, 'parameter');
            params.push(formal);
          }

          if (this.eat(Token.RPAREN)) {
            break;
          }

          this.expect(Token.COMMA);

          if (this.eat(Token.RPAREN)) {
            break;
          }
        }
      });
      return params;
    }

    parseUniqueFormalParameters() {
      return this.parseFormalParameters();
    }

    parseFunctionBody(isAsync, isGenerator, isArrow) {
      const node = this.startNode();
      this.expect(Token.LBRACE);
      this.scope.with({
        newTarget: isArrow ? undefined : true,
        return: true,
        await: isAsync,
        yield: isGenerator,
        label: 'boundary'
      }, () => {
        node.directives = [];
        node.FunctionStatementList = this.parseStatementList(Token.RBRACE, node.directives);
        node.strict = node.strict || node.directives.includes('use strict');
      });
      const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}Body`;
      return this.finishNode(node, name);
    }

  }

  const isSyntaxCharacter = c => '^$\\.*+?()[]{}|'.includes(c);

  const isClosingSyntaxCharacter = c => ')]}|'.includes(c);

  const isDecimalDigit$1 = c => /[0123456789]/u.test(c);

  const isControlLetter = c => /[a-zA-Z]/u.test(c);

  const PLUS_U = 1 << 0;
  const PLUS_N = 1 << 1;
  class RegExpParser {
    constructor(source) {
      this.source = source;
      this.position = 0;
      this.capturingGroups = [];
      this.groupSpecifiers = new Map();
      this.decimalEscapes = [];
      this.groupNameRefs = [];
      this.state = 0;
    }

    scope(flags, f) {
      const oldState = this.state;

      if (flags.U === true) {
        this.state |= PLUS_U;
      } else if (flags.U === false) {
        this.state &= ~PLUS_U;
      }

      if (flags.N === true) {
        this.state |= PLUS_N;
      } else if (flags.N === false) {
        this.state &= ~PLUS_N;
      }

      const r = f();
      this.state = oldState;
      return r;
    }

    get plusU() {
      return (this.state & PLUS_U) > 0;
    }

    get plusN() {
      return (this.state & PLUS_N) > 0;
    }

    raise(message, position = this.position) {
      const e = new SyntaxError(message);
      e.position = position;
      throw e;
    }

    peek() {
      return this.source[this.position];
    }

    test(c) {
      return this.source[this.position] === c;
    }

    eat(c) {
      if (this.test(c)) {
        this.next();
        return true;
      }

      return false;
    }

    next() {
      const c = this.source[this.position];
      this.position += 1;
      return c;
    }

    expect(c) {
      if (!this.eat(c)) {
        this.raise(`Expected ${c} but got ${this.peek()}`);
      }
    } // Pattern ::
    //   Disjunction


    parsePattern() {
      const node = {
        type: 'Pattern',
        groupSpecifiers: this.groupSpecifiers,
        capturingGroups: this.capturingGroups,
        Disjunction: undefined
      };
      node.Disjunction = this.parseDisjunction();

      if (this.position < this.source.length) {
        this.raise('Unexpected token');
      }

      this.decimalEscapes.forEach(d => {
        if (d.value > node.capturingGroups.length) {
          this.raise('Invalid decimal escape', d.position);
        }
      });
      this.groupNameRefs.forEach(g => {
        if (!node.groupSpecifiers.has(g.GroupName)) {
          this.raise('Invalid group name', g.position);
        }
      });
      return node;
    } // Disjunction ::
    //   Alternative
    //   Alternative `|` Disjunction


    parseDisjunction() {
      const node = {
        type: 'Disjunction',
        Alternative: undefined,
        Disjunction: undefined
      };
      node.Alternative = this.parseAlternative();

      if (this.eat('|')) {
        node.Disjunction = this.parseDisjunction();
      }

      return node;
    } // Alternative ::
    //   [empty]
    //   Term Alternative


    parseAlternative() {
      let node = {
        type: 'Alternative',
        Term: undefined,
        Alternative: undefined
      };

      while (this.position < this.source.length && !isClosingSyntaxCharacter(this.peek())) {
        node = {
          type: 'Alternative',
          Term: this.parseTerm(),
          Alternative: node
        };
      }

      return node;
    } // Term ::
    //   Assertion
    //   Atom
    //   Atom Quantifier


    parseTerm() {
      const assertion = this.maybeParseAssertion();

      if (assertion) {
        return assertion;
      }

      return {
        type: 'Term',
        capturingParenthesesBefore: this.capturingGroups.length,
        Atom: this.parseAtom(),
        Quantifier: this.maybeParseQuantifier()
      };
    } // Assertion ::
    //   `^`
    //   `$`
    //   `\` `b`
    //   `\` `B`
    //   `(` `?` `=` Disjunction `)`
    //   `(` `?` `!` Disjunction `)`
    //   `(` `?` `<=` Disjunction `)`
    //   `(` `?` `<!` Disjunction `)`


    maybeParseAssertion() {
      if (this.eat('^')) {
        return {
          type: 'Assertion',
          subtype: '^'
        };
      }

      if (this.eat('$')) {
        return {
          type: 'Assertion',
          subtype: '$'
        };
      }

      const look2 = this.source.slice(this.position, this.position + 2);

      if (look2 === '\\b') {
        this.position += 2;
        return {
          type: 'Assertion',
          subtype: 'b'
        };
      }

      if (look2 === '\\B') {
        this.position += 2;
        return {
          type: 'Assertion',
          subtype: 'B'
        };
      }

      const look3 = this.source.slice(this.position, this.position + 3);

      if (look3 === '(?=') {
        this.position += 3;
        const d = this.parseDisjunction();
        this.expect(')');
        return {
          type: 'Assertion',
          subtype: '?=',
          Disjunction: d
        };
      }

      if (look3 === '(?!') {
        this.position += 3;
        const d = this.parseDisjunction();
        this.expect(')');
        return {
          type: 'Assertion',
          subtype: '?!',
          Disjunction: d
        };
      }

      const look4 = this.source.slice(this.position, this.position + 4);

      if (look4 === '(?<=') {
        this.position += 4;
        const d = this.parseDisjunction();
        this.expect(')');
        return {
          type: 'Assertion',
          subtype: '?<=',
          Disjunction: d
        };
      }

      if (look4 === '(?<!') {
        this.position += 4;
        const d = this.parseDisjunction();
        this.expect(')');
        return {
          type: 'Assertion',
          subtype: '?<!',
          Disjunction: d
        };
      }

      return undefined;
    } // Quantifier ::
    //   QuantifierPrefix
    //   QuantifierPrefix `?`
    // QuantifierPrefix ::
    //   `*`
    //   `+`
    //   `?`
    //   `{` DecimalDigits `}`
    //   `{` DecimalDigits `,` `}`
    //   `{` DecimalDigits `,` DecimalDigits `}`


    maybeParseQuantifier() {
      let QuantifierPrefix;

      if (this.eat('*')) {
        QuantifierPrefix = '*';
      } else if (this.eat('+')) {
        QuantifierPrefix = '+';
      } else if (this.eat('?')) {
        QuantifierPrefix = '?';
      } else if (this.eat('{')) {
        QuantifierPrefix = {
          DecimalDigits_a: undefined,
          DecimalDigits_b: undefined
        };
        QuantifierPrefix.DecimalDigits_a = Number.parseInt(this.parseDecimalDigits(), 10);

        if (this.eat(',')) {
          if (this.test('}')) {
            QuantifierPrefix.DecimalDigits_b = Infinity;
          } else {
            QuantifierPrefix.DecimalDigits_b = Number.parseInt(this.parseDecimalDigits(), 10);
          }

          if (QuantifierPrefix.DecimalDigits_a > QuantifierPrefix.DecimalDigits_b) {
            this.raise('Numbers out of order in quantifier');
          }
        }

        this.expect('}');
      }

      if (QuantifierPrefix) {
        return {
          type: 'Quantifier',
          QuantifierPrefix,
          greedy: !this.eat('?')
        };
      }

      return undefined;
    } // Atom ::
    //   PatternCharacter
    //   `.`
    //   `\` AtomEscape
    //   CharacterClass
    //   `(` GroupSpecifier Disjunction `)`
    //   `(` `?` `:` Disjunction `)`


    parseAtom() {
      if (this.eat('.')) {
        return {
          type: 'Atom',
          subtype: '.',
          enclosedCapturingParentheses: 0
        };
      }

      if (this.eat('\\')) {
        return this.parseAtomEscape();
      }

      if (this.eat('(')) {
        const node = {
          type: 'Atom',
          capturingParenthesesBefore: this.capturingGroups.length,
          enclosedCapturingParentheses: 0,
          capturing: true,
          GroupSpecifier: undefined,
          Disjunction: undefined
        };

        if (this.eat('?')) {
          if (this.eat(':')) {
            node.capturing = false;
          } else {
            node.GroupSpecifier = this.parseGroupName();
          }
        }

        if (node.capturing) {
          this.capturingGroups.push(node);
        }

        if (node.GroupSpecifier) {
          if (this.groupSpecifiers.has(node.GroupSpecifier)) {
            this.raise(`Duplicate group specifier '${node.GroupSpecifier}'`);
          }

          this.groupSpecifiers.set(node.GroupSpecifier, node.capturingParenthesesBefore);
        }

        node.Disjunction = this.parseDisjunction();
        this.expect(')');
        node.enclosedCapturingParentheses = this.capturingGroups.length - node.capturingParenthesesBefore - 1;
        return node;
      }

      if (this.test('[')) {
        return {
          type: 'Atom',
          CharacterClass: this.parseCharacterClass()
        };
      }

      if (isSyntaxCharacter(this.peek())) {
        this.raise(`Expected a PatternCharacter but got ${this.peek()}`);
      }

      return {
        type: 'Atom',
        PatternCharacter: this.parseSourceCharacter()
      };
    } // AtomEscape ::
    //   DecimalEscape
    //   CharacterClassEscape
    //   CharacterEscape
    //   [+N] `k` GroupName


    parseAtomEscape() {
      if (this.plusN && this.eat('k')) {
        const node = {
          type: 'AtomEscape',
          position: this.position,
          GroupName: this.parseGroupName()
        };
        this.groupNameRefs.push(node);
        return node;
      }

      const CharacterClassEscape = this.maybeParseCharacterClassEscape();

      if (CharacterClassEscape) {
        return {
          type: 'AtomEscape',
          CharacterClassEscape
        };
      }

      const DecimalEscape = this.maybeParseDecimalEscape();

      if (DecimalEscape) {
        return {
          type: 'AtomEscape',
          DecimalEscape
        };
      }

      return {
        type: 'AtomEscape',
        CharacterEscape: this.parseCharacterEscape()
      };
    } // CharacterEscape ::
    //   ControlEscape
    //   `c` ControlLetter
    //   `0` [lookahead ∉ DecimalDigit]
    //   HexEscapeSequence
    //   RegExpUnicodeEscapeSequence
    //   IdentityEscape
    //
    // IdentityEscape ::
    //   [+U] SyntaxCharacter
    //   [+U] `/`
    //   [~U] SourceCharacter but not UnicodeIDContinue


    parseCharacterEscape() {
      switch (this.peek()) {
        case 'f':
        case 'n':
        case 'r':
        case 't':
        case 'v':
          return {
            type: 'CharacterEscape',
            ControlEscape: this.next()
          };

        case 'c':
          {
            this.next();
            const c = this.next();

            if (c === undefined) {
              if (this.plusU) {
                this.raise('Invalid identity escape');
              }

              return {
                type: 'CharacterEscape',
                IdentityEscape: 'c'
              };
            }

            const p = c.codePointAt(0);

            if (p >= 65 && p <= 90 || p >= 97 && p <= 122) {
              return {
                type: 'CharacterEscape',
                ControlLetter: c
              };
            }

            if (this.plusU) {
              this.raise('Invalid identity escape');
            }

            return {
              type: 'CharacterEscape',
              IdentityEscape: c
            };
          }

        case 'x':
          if (isHexDigit(this.source[this.position + 1]) && isHexDigit(this.source[this.position + 2])) {
            return {
              type: 'CharacterEscape',
              HexEscapeSequence: this.parseHexEscapeSequence()
            };
          }

          if (this.plusU) {
            this.raise('Invalid identity escape');
          }

          this.next();
          return {
            type: 'CharacterEscape',
            IdentityEscape: 'x'
          };

        case 'u':
          {
            const RegExpUnicodeEscapeSequence = this.maybeParseRegExpUnicodeEscapeSequence();

            if (RegExpUnicodeEscapeSequence) {
              return {
                type: 'CharacterEscape',
                RegExpUnicodeEscapeSequence
              };
            }

            if (this.plusU) {
              this.raise('Invalid identity escape');
            }

            this.next();
            return {
              type: 'CharacterEscape',
              IdentityEscape: 'u'
            };
          }

        default:
          {
            const c = this.next();

            if (c === undefined) {
              this.raise('Unexpected escape');
            }

            if (c === '0' && !isDecimalDigit$1(this.peek())) {
              return {
                type: 'CharacterEscape',
                subtype: '0'
              };
            }

            if (this.plusU && !isSyntaxCharacter(c) && c !== '/') {
              this.raise('Invalid identity escape');
            }

            return {
              type: 'CharacterEscape',
              IdentityEscape: c
            };
          }
      }
    } // DecimalEscape ::
    //   NonZeroDigit DecimalDigits? [lookahead != DecimalDigit]


    maybeParseDecimalEscape() {
      if (isDecimalDigit$1(this.source[this.position]) && this.source[this.position] !== '0') {
        const start = this.position;
        let buffer = this.source[this.position];
        this.position += 1;

        while (isDecimalDigit$1(this.source[this.position])) {
          buffer += this.source[this.position];
          this.position += 1;
        }

        const node = {
          type: 'DecimalEscape',
          position: start,
          value: Number.parseInt(buffer, 10)
        };
        this.decimalEscapes.push(node);
        return node;
      }

      return undefined;
    } // CharacterClassEscape ::
    //   `d`
    //   `D`
    //   `s`
    //   `S`
    //   `w`
    //   `W`
    //   [+U] `p{` UnicodePropertyValueExpression `}`
    //   [+U] `P{` UnicodePropertyValueExpression `}`


    maybeParseCharacterClassEscape() {
      switch (this.peek()) {
        case 'd':
        case 'D':
        case 's':
        case 'S':
        case 'w':
        case 'W':
          return {
            type: 'CharacterClassEscape',
            value: this.next()
          };

        case 'p':
        case 'P':
          {
            if (!this.plusU) {
              return undefined;
            }

            const value = this.next();
            this.expect('{');
            let sawDigit;
            let LoneUnicodePropertyNameOrValue = '';

            while (true) {
              if (this.position >= this.source.length) {
                this.raise('Invalid unicode property name or value');
              }

              const c = this.source[this.position];

              if (isDecimalDigit$1(c)) {
                sawDigit = true;
                this.position += 1;
                LoneUnicodePropertyNameOrValue += c;
                continue;
              }

              if (c === '_') {
                this.position += 1;
                LoneUnicodePropertyNameOrValue += c;
                continue;
              }

              if (!isControlLetter(c)) {
                break;
              }

              this.position += 1;
              LoneUnicodePropertyNameOrValue += c;
            }

            if (LoneUnicodePropertyNameOrValue.length === 0) {
              this.raise('Invalid unicode property name or value');
            }

            if (sawDigit && this.eat('}')) {
              if (!(LoneUnicodePropertyNameOrValue in UnicodeGeneralCategoryValues || LoneUnicodePropertyNameOrValue in BinaryUnicodeProperties)) {
                this.raise('Invalid unicode property name or value');
              }

              return {
                type: 'CharacterClassEscape',
                value,
                UnicodePropertyValueExpression: {
                  type: 'UnicodePropertyValueExpression',
                  LoneUnicodePropertyNameOrValue
                }
              };
            }

            let UnicodePropertyValue;

            if (this.source[this.position] === '=') {
              this.position += 1;
              UnicodePropertyValue = '';

              while (true) {
                if (this.position >= this.source.length) {
                  this.raise('Invalid unicode property value');
                }

                const c = this.source[this.position];

                if (!isControlLetter(c) && !isDecimalDigit$1(c) && c !== '_') {
                  break;
                }

                this.position += 1;
                UnicodePropertyValue += c;
              }

              if (UnicodePropertyValue.length === 0) {
                this.raise('Invalid unicode property value');
              }
            }

            this.expect('}');

            if (UnicodePropertyValue) {
              if (!(LoneUnicodePropertyNameOrValue in NonbinaryUnicodeProperties)) {
                this.raise('Invalid unicode property name');
              }

              if (!(UnicodePropertyValue in UnicodeGeneralCategoryValues || UnicodePropertyValue in UnicodeScriptValues)) {
                this.raise('Invalid unicode property value');
              }

              return {
                type: 'CharacterClassEscape',
                value,
                UnicodePropertyValueExpression: {
                  type: 'UnicodePropertyValueExpression',
                  UnicodePropertyName: LoneUnicodePropertyNameOrValue,
                  UnicodePropertyValue
                }
              };
            }

            if (!(LoneUnicodePropertyNameOrValue in UnicodeGeneralCategoryValues || LoneUnicodePropertyNameOrValue in BinaryUnicodeProperties)) {
              this.raise('Invalid unicode property name or value');
            }

            return {
              type: 'CharacterClassEscape',
              value,
              UnicodePropertyValueExpression: {
                type: 'UnicodePropertyValueExpression',
                LoneUnicodePropertyNameOrValue
              }
            };
          }

        default:
          return undefined;
      }
    } // CharacterClass ::
    //   `[` ClassRanges `]`
    //   `[` `^` ClassRanges `]`


    parseCharacterClass() {
      this.expect('[');
      const node = {
        type: 'CharacterClass',
        invert: false,
        ClassRanges: undefined
      };
      node.invert = this.eat('^');
      node.ClassRanges = this.parseClassRanges();
      this.expect(']');
      return node;
    } // ClassRanges ::
    //   [empty]
    //   NonemptyClassRanges


    parseClassRanges() {
      const ranges = [];

      while (!this.test(']')) {
        if (this.position >= this.source.length) {
          this.raise('Unexpected end of CharacterClass');
        }

        const atom = this.parseClassAtom();

        if (this.eat('-')) {
          if (atom.type === 'CharacterClassEscape') {
            this.raise('Invalid class range');
          }

          if (this.test(']')) {
            ranges.push(atom);
            ranges.push({
              type: 'ClassAtom',
              value: '-'
            });
          } else {
            const atom2 = this.parseClassAtom();

            if (atom2.type === 'CharacterClassEscape') {
              this.raise('Invalid class range');
            }

            if (CharacterValue(atom) > CharacterValue(atom2)) {
              this.raise('Invalid class range');
            }

            ranges.push([atom, atom2]);
          }
        } else {
          ranges.push(atom);
        }
      }

      return ranges;
    } // ClassAtom ::
    //   `-`
    //   ClassAtomNoDash
    // ClassAtomNoDash ::
    //   SourceCharacter but not one of `\` or `]` or `-`
    //   `\` ClassEscape
    // ClassEscape :
    //   `b`
    //   [+U] `-`
    //   CharacterClassEscape
    //   CharacterEscape


    parseClassAtom() {
      if (this.eat('\\')) {
        if (this.eat('b')) {
          return {
            type: 'ClassEscape',
            value: 'b'
          };
        }

        if (this.plusU && this.eat('-')) {
          return {
            type: 'ClassEscape',
            value: '-'
          };
        }

        const CharacterClassEscape = this.maybeParseCharacterClassEscape();

        if (CharacterClassEscape) {
          return CharacterClassEscape;
        }

        return {
          type: 'ClassEscape',
          CharacterEscape: this.parseCharacterEscape()
        };
      }

      return {
        type: 'ClassAtom',
        SourceCharacter: this.parseSourceCharacter()
      };
    }

    parseSourceCharacter() {
      const lead = this.source.charCodeAt(this.position);
      const trail = this.source.charCodeAt(this.position + 1);

      if (trail && isLeadingSurrogate(lead) && isTrailingSurrogate(trail)) {
        return this.next() + this.next();
      }

      return this.next();
    }

    parseGroupName() {
      this.expect('<');
      const RegExpIdentifierName = this.parseRegExpIdentifierName();
      this.expect('>');
      return RegExpIdentifierName;
    } // RegExpIdentifierName ::
    //   RegExpIdentifierStart
    //   RegExpIdentifierName RegExpIdentifierPart


    parseRegExpIdentifierName() {
      let buffer = '';
      let check = isIdentifierStart;

      while (this.position < this.source.length) {
        const c = this.source[this.position];
        const code = c.charCodeAt(0);

        if (c === '\\') {
          this.position += 1;
          const RegExpUnicodeEscapeSequence = this.scope({
            U: true
          }, () => this.maybeParseRegExpUnicodeEscapeSequence());

          if (!RegExpUnicodeEscapeSequence) {
            this.raise('Invalid unicode escape');
          }

          const raw = String.fromCodePoint(CharacterValue(RegExpUnicodeEscapeSequence));

          if (!check(raw)) {
            this.raise('Invalid identifier escape');
          }

          buffer += raw;
        } else if (isLeadingSurrogate(code)) {
          const lowSurrogate = this.source.charCodeAt(this.position + 1);

          if (!isTrailingSurrogate(lowSurrogate)) {
            this.raise('Invalid trailing surrogate');
          }

          const codePoint = UTF16SurrogatePairToCodePoint(code, lowSurrogate);
          const raw = String.fromCodePoint(codePoint);

          if (!check(raw)) {
            this.raise('Invalid surrogate pair');
          }

          this.position += 2;
          buffer += raw;
        } else if (check(c)) {
          buffer += c;
          this.position += 1;
        } else {
          break;
        }

        check = isIdentifierPart;
      }

      if (buffer.length === 0) {
        this.raise('Invalid empty identifier');
      }

      return buffer;
    } // DecimalDigits ::
    //   DecimalDigit
    //   DecimalDigits DecimalDigit


    parseDecimalDigits() {
      let n = '';

      if (!isDecimalDigit$1(this.peek())) {
        this.raise('Invalid decimal digits');
      }

      while (isDecimalDigit$1(this.peek())) {
        n += this.next();
      }

      return n;
    } // HexEscapeSequence ::
    //   `x` HexDigit HexDigit


    parseHexEscapeSequence() {
      this.expect('x');
      const HexDigit_a = this.next();

      if (!isHexDigit(HexDigit_a)) {
        this.raise('Not a hex digit');
      }

      const HexDigit_b = this.next();

      if (!isHexDigit(HexDigit_b)) {
        this.raise('Not a hex digit');
      }

      return {
        type: 'HexEscapeSequence',
        HexDigit_a,
        HexDigit_b
      };
    }

    scanHex(length) {
      if (length === 0) {
        this.raise('Invalid code point');
      }

      let n = 0;

      for (let i = 0; i < length; i += 1) {
        const c = this.source[this.position];

        if (isHexDigit(c)) {
          this.position += 1;
          n = n << 4 | Number.parseInt(c, 16);
        } else {
          this.raise('Invalid hex digit');
        }
      }

      return n;
    } // RegExpUnicodeEscapeSequence ::
    //   [+U] `u` HexLeadSurrogate `\u` HexTrailSurrogate
    //   [+U] `u` HexLeadSurrogate
    //   [+U] `u` HexTrailSurrogate
    //   [+U] `u` HexNonSurrogate
    //   [~U] `u` Hex4Digits
    //   [+U] `u{` CodePoint `}`


    maybeParseRegExpUnicodeEscapeSequence() {
      const start = this.position;

      if (!this.eat('u')) {
        this.position = start;
        return undefined;
      }

      if (this.plusU && this.eat('{')) {
        const end = this.source.indexOf('}', this.position);

        if (end === -1) {
          this.raise('Invalid code point');
        }

        const code = this.scanHex(end - this.position);

        if (code > 0x10FFFF) {
          this.raise('Invalid code point');
        }

        this.position += 1;
        return {
          type: 'RegExpUnicodeEscapeSequence',
          CodePoint: code
        };
      }

      let lead;

      try {
        lead = this.scanHex(4);
      } catch {
        this.position = start;
        return undefined;
      }

      if (this.plusU && isLeadingSurrogate(lead)) {
        const back = this.position;

        if (this.eat('\\') && this.eat('u')) {
          let trail;

          try {
            trail = this.scanHex(4);
          } catch {
            this.position = back;
          }

          return {
            type: 'RegExpUnicodeEscapeSequence',
            HexLeadSurrogate: lead,
            HexTrailSurrogate: trail
          };
        }

        return {
          type: 'RegExpUnicodeEscapeSequence',
          HexLeadSurrogate: lead
        };
      }

      return {
        type: 'RegExpUnicodeEscapeSequence',
        Hex4Digits: lead
      };
    }

  }

  class ExpressionParser extends FunctionParser {
    // Expression :
    //   AssignmentExpression
    //   Expression `,` AssignmentExpression
    parseExpression() {
      const node = this.startNode();
      const AssignmentExpression = this.parseAssignmentExpression();

      if (this.eat(Token.COMMA)) {
        node.ExpressionList = [AssignmentExpression];

        do {
          node.ExpressionList.push(this.parseAssignmentExpression());
        } while (this.eat(Token.COMMA));

        return this.finishNode(node, 'CommaOperator');
      }

      return AssignmentExpression;
    } // AssignmentExpression :
    //   ConditionalExpression
    //   [+Yield] YieldExpression
    //   ArrowFunction
    //   AsyncArrowFunction
    //   LeftHandSideExpression `=` AssignmentExpression
    //   LeftHandSideExpression AssignmentOperator AssignmentExpression
    //   LeftHandSideExpression LogicalAssignmentOperator AssignmentExpression
    //
    // AssignmentOperator : one of
    //   *= /= %= += -= <<= >>= >>>= &= ^= |= **=
    //
    // LogicalAssignmentOperator : one of
    //   &&= ||= ??=


    parseAssignmentExpression() {
      if (this.test(Token.YIELD) && this.scope.hasYield()) {
        return this.parseYieldExpression();
      }

      const node = this.startNode();
      this.scope.pushAssignmentInfo('assign');
      const left = this.parseConditionalExpression();
      const assignmentInfo = this.scope.popAssignmentInfo();

      if (left.type === 'IdentifierReference') {
        // `async` [no LineTerminator here] IdentifierReference [no LineTerminator here] `=>`
        if (left.name === 'async' && this.test(Token.IDENTIFIER) && !this.peek().hadLineTerminatorBefore && this.testAhead(Token.ARROW) && !this.peekAhead().hadLineTerminatorBefore) {
          assignmentInfo.clear();
          return this.parseArrowFunction(node, {
            Arguments: [this.parseIdentifierReference()]
          }, FunctionKind.ASYNC);
        } // IdentifierReference [no LineTerminator here] `=>`


        if (this.test(Token.ARROW) && !this.peek().hadLineTerminatorBefore) {
          assignmentInfo.clear();
          return this.parseArrowFunction(node, {
            Arguments: [left]
          }, FunctionKind.NORMAL);
        }
      } // `async` [no LineTerminator here] Arguments [no LineTerminator here] `=>`


      if (left.type === 'CallExpression' && left.arrowInfo && this.test(Token.ARROW) && !this.peek().hadLineTerminatorBefore) {
        const last = left.Arguments[left.Arguments.length - 1];

        if (!left.arrowInfo.trailingComma || last && last.type !== 'AssignmentRestElement') {
          assignmentInfo.clear();
          return this.parseArrowFunction(node, left, FunctionKind.ASYNC);
        }
      }

      if (left.type === 'CoverParenthesizedExpressionAndArrowParameterList') {
        assignmentInfo.clear();
        return this.parseArrowFunction(node, left, FunctionKind.NORMAL);
      }

      switch (this.peek().type) {
        case Token.ASSIGN:
        case Token.ASSIGN_MUL:
        case Token.ASSIGN_DIV:
        case Token.ASSIGN_MOD:
        case Token.ASSIGN_ADD:
        case Token.ASSIGN_SUB:
        case Token.ASSIGN_SHL:
        case Token.ASSIGN_SAR:
        case Token.ASSIGN_SHR:
        case Token.ASSIGN_BIT_AND:
        case Token.ASSIGN_BIT_XOR:
        case Token.ASSIGN_BIT_OR:
        case Token.ASSIGN_EXP:
        case Token.ASSIGN_AND:
        case Token.ASSIGN_OR:
        case Token.ASSIGN_NULLISH:
          assignmentInfo.clear();
          this.validateAssignmentTarget(left);
          node.LeftHandSideExpression = left;
          node.AssignmentOperator = this.next().value;
          node.AssignmentExpression = this.parseAssignmentExpression();
          return this.finishNode(node, 'AssignmentExpression');

        default:
          return left;
      }
    }

    validateAssignmentTarget(node) {
      switch (node.type) {
        case 'IdentifierReference':
          if (this.isStrictMode() && (node.name === 'eval' || node.name === 'arguments')) {
            break;
          }

          return;

        case 'CoverInitializedName':
          this.validateAssignmentTarget(node.IdentifierReference);
          return;

        case 'MemberExpression':
          return;

        case 'SuperProperty':
          return;

        case 'ParenthesizedExpression':
          if (node.Expression.type === 'ObjectLiteral' || node.Expression.type === 'ArrayLiteral') {
            break;
          }

          this.validateAssignmentTarget(node.Expression);
          return;

        case 'ArrayLiteral':
          node.ElementList.forEach((p, i) => {
            if (p.type === 'SpreadElement' && (i !== node.ElementList.length - 1 || node.hasTrailingComma)) {
              this.raiseEarly('InvalidAssignmentTarget', p);
            }

            if (p.type === 'AssignmentExpression') {
              this.validateAssignmentTarget(p.LeftHandSideExpression);
            } else {
              this.validateAssignmentTarget(p);
            }
          });
          return;

        case 'ObjectLiteral':
          node.PropertyDefinitionList.forEach((p, i) => {
            if (p.type === 'PropertyDefinition' && !p.PropertyName && i !== node.PropertyDefinitionList.length - 1) {
              this.raiseEarly('InvalidAssignmentTarget', p);
            }

            this.validateAssignmentTarget(p);
          });
          return;

        case 'PropertyDefinition':
          if (node.AssignmentExpression.type === 'AssignmentExpression') {
            this.validateAssignmentTarget(node.AssignmentExpression.LeftHandSideExpression);
          } else {
            this.validateAssignmentTarget(node.AssignmentExpression);
          }

          return;

        case 'Elision':
          return;

        case 'SpreadElement':
          if (node.AssignmentExpression.type === 'AssignmentExpression') {
            break;
          }

          this.validateAssignmentTarget(node.AssignmentExpression);
          return;
      }

      this.raiseEarly('InvalidAssignmentTarget', node);
    } // YieldExpression :
    //   `yield`
    //   `yield` [no LineTerminator here] AssignmentExpression
    //   `yield` [no LineTerminator here] `*` AssignmentExpression


    parseYieldExpression() {
      if (this.scope.inParameters()) {
        this.raiseEarly('YieldInFormalParameters');
      }

      const node = this.startNode();
      this.expect(Token.YIELD);

      if (this.peek().hadLineTerminatorBefore) {
        node.hasStar = false;
        node.AssignmentExpression = null;
      } else {
        node.hasStar = this.eat(Token.MUL);

        if (node.hasStar) {
          node.AssignmentExpression = this.parseAssignmentExpression();
        } else {
          switch (this.peek().type) {
            case Token.EOS:
            case Token.SEMICOLON:
            case Token.RBRACE:
            case Token.RBRACK:
            case Token.RPAREN:
            case Token.COLON:
            case Token.COMMA:
            case Token.IN:
              node.AssignmentExpression = null;
              break;

            default:
              node.AssignmentExpression = this.parseAssignmentExpression();
          }
        }
      }

      if (this.scope.arrowInfoStack.length > 0) {
        this.scope.arrowInfoStack[this.scope.arrowInfoStack.length - 1].yieldExpressions.push(node);
      }

      return this.finishNode(node, 'YieldExpression');
    } // ConditionalExpression :
    //   ShortCircuitExpression
    //   ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression


    parseConditionalExpression() {
      const node = this.startNode();
      const ShortCircuitExpression = this.parseShortCircuitExpression();

      if (this.eat(Token.CONDITIONAL)) {
        node.ShortCircuitExpression = ShortCircuitExpression;
        this.scope.with({
          in: true
        }, () => {
          node.AssignmentExpression_a = this.parseAssignmentExpression();
        });
        this.expect(Token.COLON);
        node.AssignmentExpression_b = this.parseAssignmentExpression();
        return this.finishNode(node, 'ConditionalExpression');
      }

      return ShortCircuitExpression;
    } // ShortCircuitExpression :
    //   LogicalORExpression
    //   CoalesceExpression
    //
    // CoalesceExpression :
    //   CoalesceExpressionHead `??` BitwiseORExpression
    //
    // CoalesceExpressionHead :
    //   CoalesceExpression
    //   BitwiseORExpression


    parseShortCircuitExpression() {
      // Start parse at BIT_OR, right above AND/OR/NULLISH
      const expression = this.parseBinaryExpression(TokenPrecedence[Token.BIT_OR]);

      switch (this.peek().type) {
        case Token.AND:
        case Token.OR:
          // Drop into normal binary chain starting at OR
          return this.parseBinaryExpression(TokenPrecedence[Token.OR], expression);

        case Token.NULLISH:
          {
            let x = expression;

            while (this.eat(Token.NULLISH)) {
              const node = this.startNode();
              node.CoalesceExpressionHead = x;
              node.BitwiseORExpression = this.parseBinaryExpression(TokenPrecedence[Token.BIT_OR]);
              x = this.finishNode(node, 'CoalesceExpression');
            }

            return x;
          }

        default:
          return expression;
      }
    }

    parseBinaryExpression(precedence, x = this.parseUnaryExpression()) {
      let p = TokenPrecedence[this.peek().type];

      if (p >= precedence) {
        do {
          while (TokenPrecedence[this.peek().type] === p) {
            const left = x;

            if (p === TokenPrecedence[Token.EXP] && (left.type === 'UnaryExpression' || left.type === 'AwaitExpression')) {
              return left;
            }

            const node = this.startNode(left);

            if (this.peek().type === Token.IN && !this.scope.hasIn()) {
              return left;
            }

            const op = this.next();
            const right = this.parseBinaryExpression(op.type === Token.EXP ? p : p + 1);
            let name;

            switch (op.type) {
              case Token.EXP:
                name = 'ExponentiationExpression';
                node.UpdateExpression = left;
                node.ExponentiationExpression = right;
                break;

              case Token.MUL:
              case Token.DIV:
              case Token.MOD:
                name = 'MultiplicativeExpression';
                node.MultiplicativeExpression = left;
                node.MultiplicativeOperator = op.value;
                node.ExponentiationExpression = right;
                break;

              case Token.ADD:
              case Token.SUB:
                name = 'AdditiveExpression';
                node.AdditiveExpression = left;
                node.MultiplicativeExpression = right;
                node.operator = op.value;
                break;

              case Token.SHL:
              case Token.SAR:
              case Token.SHR:
                name = 'ShiftExpression';
                node.ShiftExpression = left;
                node.AdditiveExpression = right;
                node.operator = op.value;
                break;

              case Token.LT:
              case Token.GT:
              case Token.LTE:
              case Token.GTE:
              case Token.INSTANCEOF:
              case Token.IN:
                name = 'RelationalExpression';
                node.RelationalExpression = left;
                node.ShiftExpression = right;
                node.operator = op.value;
                break;

              case Token.EQ:
              case Token.NE:
              case Token.EQ_STRICT:
              case Token.NE_STRICT:
                name = 'EqualityExpression';
                node.EqualityExpression = left;
                node.RelationalExpression = right;
                node.operator = op.value;
                break;

              case Token.BIT_AND:
                name = 'BitwiseANDExpression';
                node.A = left;
                node.operator = op.value;
                node.B = right;
                break;

              case Token.BIT_XOR:
                name = 'BitwiseXORExpression';
                node.A = left;
                node.operator = op.value;
                node.B = right;
                break;

              case Token.BIT_OR:
                name = 'BitwiseORExpression';
                node.A = left;
                node.operator = op.value;
                node.B = right;
                break;

              case Token.AND:
                name = 'LogicalANDExpression';
                node.LogicalANDExpression = left;
                node.BitwiseORExpression = right;
                break;

              case Token.OR:
                name = 'LogicalORExpression';
                node.LogicalORExpression = left;
                node.LogicalANDExpression = right;
                break;

              default:
                this.unexpected(op);
            }

            x = this.finishNode(node, name);
          }

          p -= 1;
        } while (p >= precedence);
      }

      return x;
    } // UnaryExpression :
    //   UpdateExpression
    //   `delete` UnaryExpression
    //   `void` UnaryExpression
    //   `typeof` UnaryExpression
    //   `+` UnaryExpression
    //   `-` UnaryExpression
    //   `~` UnaryExpression
    //   `!` UnaryExpression
    //   [+Await] AwaitExpression


    parseUnaryExpression() {
      return this.scope.with({
        in: true
      }, () => {
        if (this.test(Token.AWAIT) && this.scope.hasAwait()) {
          return this.parseAwaitExpression();
        }

        const node = this.startNode();

        switch (this.peek().type) {
          case Token.DELETE:
          case Token.VOID:
          case Token.TYPEOF:
          case Token.ADD:
          case Token.SUB:
          case Token.BIT_NOT:
          case Token.NOT:
            node.operator = this.next().value;
            node.UnaryExpression = this.parseUnaryExpression();

            if (this.isStrictMode() && node.operator === 'delete' && node.UnaryExpression.type === 'IdentifierReference') {
              this.raiseEarly('DeleteIdentifier', node.UnaryExpression);
            }

            return this.finishNode(node, 'UnaryExpression');

          default:
            return this.parseUpdateExpression();
        }
      });
    } // AwaitExpression : `await` UnaryExpression


    parseAwaitExpression() {
      if (this.scope.inParameters()) {
        this.raiseEarly('AwaitInFormalParameters');
      }

      const node = this.startNode();
      this.expect(Token.AWAIT);
      node.UnaryExpression = this.parseUnaryExpression();

      if (this.scope.arrowInfoStack.length > 0) {
        this.scope.arrowInfoStack[this.scope.arrowInfoStack.length - 1].awaitExpressions.push(node);
      }

      if (!this.scope.hasReturn()) {
        this.state.hasTopLevelAwait = true;
      }

      return this.finishNode(node, 'AwaitExpression');
    } // UpdateExpression :
    //   LeftHandSideExpression
    //   LeftHandSideExpression [no LineTerminator here] `++`
    //   LeftHandSideExpression [no LineTerminator here] `--`
    //   `++` UnaryExpression
    //   `--` UnaryExpression


    parseUpdateExpression() {
      if (this.test(Token.INC) || this.test(Token.DEC)) {
        const node = this.startNode();
        node.operator = this.next().value;
        node.LeftHandSideExpression = null;
        node.UnaryExpression = this.parseUnaryExpression();
        this.validateAssignmentTarget(node.UnaryExpression);
        return this.finishNode(node, 'UpdateExpression');
      }

      const argument = this.parseLeftHandSideExpression();

      if (!this.peek().hadLineTerminatorBefore) {
        if (this.test(Token.INC) || this.test(Token.DEC)) {
          this.validateAssignmentTarget(argument);
          const node = this.startNode();
          node.operator = this.next().value;
          node.LeftHandSideExpression = argument;
          node.UnaryExpression = null;
          return this.finishNode(node, 'UpdateExpression');
        }
      }

      return argument;
    } // LeftHandSideExpression


    parseLeftHandSideExpression(allowCalls = true) {
      let result;

      switch (this.peek().type) {
        case Token.NEW:
          result = this.parseNewExpression();
          break;

        case Token.SUPER:
          {
            const node = this.startNode();
            this.next();

            if (this.test(Token.LPAREN)) {
              if (!this.scope.hasSuperCall()) {
                this.raiseEarly('InvalidSuperCall');
              }

              node.Arguments = this.parseArguments().Arguments;
              result = this.finishNode(node, 'SuperCall');
            } else {
              if (!this.scope.hasSuperProperty()) {
                this.raiseEarly('InvalidSuperProperty');
              }

              if (this.eat(Token.LBRACK)) {
                node.Expression = this.parseExpression();
                this.expect(Token.RBRACK);
                node.IdentifierName = null;
              } else {
                this.expect(Token.PERIOD);
                node.Expression = null;
                node.IdentifierName = this.parseIdentifierName();
              }

              result = this.finishNode(node, 'SuperProperty');
            }

            break;
          }

        case Token.IMPORT:
          {
            const node = this.startNode();
            this.next();

            if (this.scope.hasImportMeta() && this.eat(Token.PERIOD)) {
              this.expect('meta');
              result = this.finishNode(node, 'ImportMeta');
            } else {
              if (!allowCalls) {
                this.unexpected();
              }

              this.expect(Token.LPAREN);
              node.AssignmentExpression = this.parseAssignmentExpression();
              this.expect(Token.RPAREN);
              result = this.finishNode(node, 'ImportCall');
            }

            break;
          }

        default:
          result = this.parsePrimaryExpression();
          break;
      }

      const check = allowCalls ? isPropertyOrCall : isMember;

      while (check(this.peek().type)) {
        const node = this.startNode(result);

        switch (this.peek().type) {
          case Token.LBRACK:
            {
              this.next();
              node.MemberExpression = result;
              node.IdentifierName = null;
              node.Expression = this.parseExpression();
              result = this.finishNode(node, 'MemberExpression');
              this.expect(Token.RBRACK);
              break;
            }

          case Token.PERIOD:
            this.next();
            node.MemberExpression = result;
            node.IdentifierName = this.parseIdentifierName();
            node.Expression = null;
            result = this.finishNode(node, 'MemberExpression');
            break;

          case Token.LPAREN:
            {
              // `async` [no LineTerminator here] `(`
              const couldBeArrow = this.matches('async', this.currentToken) && result.type === 'IdentifierReference' && !this.peek().hadLineTerminatorBefore;

              if (couldBeArrow) {
                this.scope.pushArrowInfo(true);
              }

              const {
                Arguments,
                trailingComma
              } = this.parseArguments();
              node.CallExpression = result;
              node.Arguments = Arguments;

              if (couldBeArrow) {
                node.arrowInfo = this.scope.popArrowInfo();
                node.arrowInfo.trailingComma = trailingComma;
              }

              result = this.finishNode(node, 'CallExpression');
              break;
            }

          case Token.OPTIONAL:
            node.MemberExpression = result;
            node.OptionalChain = this.parseOptionalChain();
            result = this.finishNode(node, 'OptionalExpression');
            break;

          case Token.TEMPLATE:
            node.MemberExpression = result;
            node.TemplateLiteral = this.parseTemplateLiteral(true);
            result = this.finishNode(node, 'TaggedTemplateExpression');
            break;

          default:
            this.unexpected();
        }
      }

      return result;
    } // OptionalChain


    parseOptionalChain() {
      this.expect(Token.OPTIONAL);
      let base = this.startNode();
      base.OptionalChain = null;

      if (this.test(Token.LPAREN)) {
        base.Arguments = this.parseArguments().Arguments;
      } else if (this.eat(Token.LBRACK)) {
        base.Expression = this.parseExpression();
        this.expect(Token.RBRACK);
      } else if (this.test(Token.TEMPLATE)) {
        this.raise('TemplateInOptionalChain');
      } else {
        base.IdentifierName = this.parseIdentifierName();
      }

      base = this.finishNode(base, 'OptionalChain');

      while (true) {
        const node = this.startNode();

        if (this.test(Token.LPAREN)) {
          node.OptionalChain = base;
          node.Arguments = this.parseArguments().Arguments;
          base = this.finishNode(node, 'OptionalChain');
        } else if (this.eat(Token.LBRACK)) {
          node.OptionalChain = base;
          node.Expression = this.parseExpression();
          this.expect(Token.RBRACK);
          base = this.finishNode(node, 'OptionalChain');
        } else if (this.test(Token.TEMPLATE)) {
          this.raise('TemplateInOptionalChain');
        } else if (this.eat(Token.PERIOD)) {
          node.OptionalChain = base;
          node.IdentifierName = this.parseIdentifierName();
          base = this.finishNode(node, 'OptionalChain');
        } else {
          return base;
        }
      }
    } // NewExpression


    parseNewExpression() {
      const node = this.startNode();
      this.expect(Token.NEW);

      if (this.scope.hasNewTarget() && this.eat(Token.PERIOD)) {
        this.expect('target');
        return this.finishNode(node, 'NewTarget');
      }

      node.MemberExpression = this.parseLeftHandSideExpression(false);

      if (this.test(Token.LPAREN)) {
        node.Arguments = this.parseArguments().Arguments;
      } else {
        node.Arguments = null;
      }

      return this.finishNode(node, 'NewExpression');
    } // PrimaryExpression :
    //   ...


    parsePrimaryExpression() {
      switch (this.peek().type) {
        case Token.IDENTIFIER:
        case Token.ESCAPED_KEYWORD:
        case Token.YIELD:
        case Token.AWAIT:
          // `async` [no LineTerminator here] `function`
          if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
            return this.parseFunctionExpression(FunctionKind.ASYNC);
          }

          return this.parseIdentifierReference();

        case Token.THIS:
          {
            const node = this.startNode();
            this.next();
            return this.finishNode(node, 'ThisExpression');
          }

        case Token.NUMBER:
        case Token.BIGINT:
          return this.parseNumericLiteral();

        case Token.STRING:
          return this.parseStringLiteral();

        case Token.NULL:
          {
            const node = this.startNode();
            this.next();
            return this.finishNode(node, 'NullLiteral');
          }

        case Token.TRUE:
        case Token.FALSE:
          return this.parseBooleanLiteral();

        case Token.LBRACK:
          return this.parseArrayLiteral();

        case Token.LBRACE:
          return this.parseObjectLiteral();

        case Token.FUNCTION:
          return this.parseFunctionExpression(FunctionKind.NORMAL);

        case Token.CLASS:
          return this.parseClassExpression();

        case Token.TEMPLATE:
          return this.parseTemplateLiteral();

        case Token.DIV:
        case Token.ASSIGN_DIV:
          return this.parseRegularExpressionLiteral();

        case Token.LPAREN:
          return this.parseCoverParenthesizedExpressionAndArrowParameterList();

        default:
          return this.unexpected();
      }
    } // NumericLiteral


    parseNumericLiteral() {
      const node = this.startNode();

      if (!this.test(Token.NUMBER) && !this.test(Token.BIGINT)) {
        this.unexpected();
      }

      node.value = this.next().value;
      return this.finishNode(node, 'NumericLiteral');
    } // StringLiteral


    parseStringLiteral() {
      const node = this.startNode();

      if (!this.test(Token.STRING)) {
        this.unexpected();
      }

      node.value = this.next().value;
      return this.finishNode(node, 'StringLiteral');
    } // BooleanLiteral :
    //   `true`
    //   `false`


    parseBooleanLiteral() {
      const node = this.startNode();

      switch (this.peek().type) {
        case Token.TRUE:
          this.next();
          node.value = true;
          break;

        case Token.FALSE:
          this.next();
          node.value = false;
          break;

        default:
          this.unexpected();
      }

      return this.finishNode(node, 'BooleanLiteral');
    } // ArrayLiteral :
    //   `[` `]`
    //   `[` Elision `]`
    //   `[` ElementList `]`
    //   `[` ElementList `,` `]`
    //   `[` ElementList `,` Elision `]`


    parseArrayLiteral() {
      const node = this.startNode();
      this.expect(Token.LBRACK);
      node.ElementList = [];
      node.hasTrailingComma = false;

      while (true) {
        while (this.test(Token.COMMA)) {
          const elision = this.startNode();
          this.next();
          node.ElementList.push(this.finishNode(elision, 'Elision'));
        }

        if (this.eat(Token.RBRACK)) {
          break;
        }

        if (this.test(Token.ELLIPSIS)) {
          const spread = this.startNode();
          this.next();
          spread.AssignmentExpression = this.parseAssignmentExpression();
          node.ElementList.push(this.finishNode(spread, 'SpreadElement'));
        } else {
          node.ElementList.push(this.parseAssignmentExpression());
        }

        if (this.eat(Token.RBRACK)) {
          node.hasTrailingComma = false;
          break;
        }

        node.hasTrailingComma = true;
        this.expect(Token.COMMA);
      }

      return this.finishNode(node, 'ArrayLiteral');
    } // ObjectLiteral :
    //   `{` `}`
    //   `{` PropertyDefinitionList `}`
    //   `{` PropertyDefinitionList `,` `}`


    parseObjectLiteral() {
      const node = this.startNode();
      this.expect(Token.LBRACE);
      node.PropertyDefinitionList = [];
      let hasProto = false;

      while (true) {
        if (this.eat(Token.RBRACE)) {
          break;
        }

        const PropertyDefinition = this.parsePropertyDefinition();

        if (!this.state.json && PropertyDefinition.type === 'PropertyDefinition' && PropertyDefinition.PropertyName && !IsComputedPropertyKey(PropertyDefinition.PropertyName) && PropertyDefinition.PropertyName.type !== 'NumericLiteral' && StringValue(PropertyDefinition.PropertyName).stringValue() === '__proto__') {
          if (hasProto) {
            this.scope.registerObjectLiteralEarlyError(this.raiseEarly('DuplicateProto', PropertyDefinition.PropertyName));
          } else {
            hasProto = true;
          }
        }

        node.PropertyDefinitionList.push(PropertyDefinition);

        if (this.eat(Token.RBRACE)) {
          break;
        }

        this.expect(Token.COMMA);
      }

      return this.finishNode(node, 'ObjectLiteral');
    }

    parsePropertyDefinition() {
      return this.parseBracketedDefinition('property');
    }

    parseFunctionExpression(kind) {
      return this.parseFunction(true, kind);
    }

    parseArguments() {
      this.expect(Token.LPAREN);

      if (this.eat(Token.RPAREN)) {
        return {
          Arguments: [],
          trailingComma: false
        };
      }

      const Arguments = [];
      let trailingComma = false;

      while (true) {
        const node = this.startNode();

        if (this.eat(Token.ELLIPSIS)) {
          node.AssignmentExpression = this.parseAssignmentExpression();
          Arguments.push(this.finishNode(node, 'AssignmentRestElement'));
        } else {
          Arguments.push(this.parseAssignmentExpression());
        }

        if (this.eat(Token.RPAREN)) {
          break;
        }

        this.expect(Token.COMMA);

        if (this.eat(Token.RPAREN)) {
          trailingComma = true;
          break;
        }
      }

      return {
        Arguments,
        trailingComma
      };
    } // #sec-class-definitions
    // ClassDeclaration :
    //   `class` BindingIdentifier ClassTail
    //   [+Default] `class` ClassTail
    //
    // ClassExpression :
    //   `class` BindingIdentifier? ClassTail


    parseClass(isExpression) {
      const node = this.startNode();
      this.expect(Token.CLASS);
      this.scope.with({
        strict: true
      }, () => {
        if (!this.test(Token.LBRACE) && !this.test(Token.EXTENDS)) {
          node.BindingIdentifier = this.parseBindingIdentifier();

          if (!isExpression) {
            this.scope.declare(node.BindingIdentifier, 'lexical');
          }
        } else if (isExpression === false && !this.scope.isDefault()) {
          this.raise('ClassMissingBindingIdentifier');
        } else {
          node.BindingIdentifier = null;
        }

        node.ClassTail = this.scope.with({
          default: false
        }, () => this.parseClassTail());
      });
      return this.finishNode(node, isExpression ? 'ClassExpression' : 'ClassDeclaration');
    } // ClassTail : ClassHeritage? `{` ClassBody? `}`
    // ClassHeritage : `extends` LeftHandSideExpression
    // ClassBody : ClassElementList


    parseClassTail() {
      const node = this.startNode();

      if (this.eat(Token.EXTENDS)) {
        node.ClassHeritage = this.parseLeftHandSideExpression();
      } else {
        node.ClassHeritage = null;
      }

      this.expect(Token.LBRACE);

      if (this.eat(Token.RBRACE)) {
        node.ClassBody = null;
      } else {
        this.scope.with({
          superCall: !!node.ClassHeritage
        }, () => {
          node.ClassBody = [];
          let hasConstructor = false;

          while (!this.eat(Token.RBRACE)) {
            const m = this.parseClassElement();
            node.ClassBody.push(m);
            const name = PropName(m.MethodDefinition);
            const isActualConstructor = !m.static && !!m.MethodDefinition.UniqueFormalParameters && m.MethodDefinition.type === 'MethodDefinition' && name === 'constructor';

            if (isActualConstructor) {
              if (hasConstructor) {
                this.raiseEarly('DuplicateConstructor', m);
              } else {
                hasConstructor = true;
              }
            }

            if (m.static && name === 'prototype' || !m.static && !isActualConstructor && name === 'constructor') {
              this.raiseEarly('InvalidMethodName', m, name);
            }
          }
        });
      }

      return this.finishNode(node, 'ClassTail');
    } // ClassElement :
    //   `static` MethodDefinition
    //   MethodDefinition


    parseClassElement() {
      const node = this.startNode();
      node.static = this.eat('static');
      node.MethodDefinition = this.parseMethodDefinition(node.static);

      while (this.eat(Token.SEMICOLON)) {// nothing
      }

      return this.finishNode(node, 'ClassElement');
    }

    parseMethodDefinition(isStatic) {
      return this.parseBracketedDefinition('method', isStatic);
    }

    parseClassExpression() {
      return this.parseClass(true);
    }

    parseTemplateLiteral(tagged = false) {
      const node = this.startNode();
      node.TemplateSpanList = [];
      node.ExpressionList = [];
      let buffer = '';

      while (true) {
        if (this.position >= this.source.length) {
          this.raise('UnterminatedTemplate', this.position);
        }

        const c = this.source[this.position];

        switch (c) {
          case '`':
            this.position += 1;
            node.TemplateSpanList.push(buffer);
            this.next();

            if (!tagged) {
              node.TemplateSpanList.forEach(s => {
                if (TV(s) === undefined) {
                  this.raise('InvalidTemplateEscape');
                }
              });
            }

            return this.finishNode(node, 'TemplateLiteral');

          case '$':
            this.position += 1;

            if (this.source[this.position] === '{') {
              this.position += 1;
              node.TemplateSpanList.push(buffer);
              buffer = '';
              this.next();
              node.ExpressionList.push(this.parseExpression());
              break;
            }

            buffer += c;
            break;

          default:
            {
              if (c === '\\') {
                buffer += c;
                this.position += 1;
              }

              const l = this.source[this.position];
              this.position += 1;

              if (isLineTerminator(l)) {
                if (l === '\r' && this.source[this.position] === '\n') {
                  this.position += 1;
                }

                if (l === '\u{2028}' || l === '\u{2029}') {
                  buffer += l;
                } else {
                  buffer += '\n';
                }

                this.line += 1;
                this.columnOffset = this.position;
              } else {
                buffer += l;
              }

              break;
            }
        }
      }
    } // RegularExpressionLiteral :
    //   `/` RegularExpressionBody `/` RegularExpressionFlags


    parseRegularExpressionLiteral() {
      const node = this.startNode();
      this.scanRegularExpressionBody();
      node.RegularExpressionBody = this.scannedValue;
      this.scanRegularExpressionFlags();
      node.RegularExpressionFlags = this.scannedValue;

      try {
        const parse = flags => {
          const p = new RegExpParser(node.RegularExpressionBody);
          return p.scope(flags, () => p.parsePattern());
        };

        if (node.RegularExpressionFlags.includes('u')) {
          parse({
            U: true,
            N: true
          });
        } else {
          const pattern = parse({
            U: false,
            N: false
          });

          if (pattern.groupSpecifiers.size > 0) {
            parse({
              U: false,
              N: true
            });
          }
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          this.raise('Raw', node.location.startIndex + e.position + 1, e.message);
        } else {
          throw e;
        }
      }

      const fakeToken = {
        endIndex: this.position - 1,
        line: this.line - 1,
        column: this.position - this.columnOffset
      };
      this.next();
      this.currentToken = fakeToken;
      return this.finishNode(node, 'RegularExpressionLiteral');
    } // CoverParenthesizedExpressionAndArrowParameterList :
    //   `(` Expression `)`
    //   `(` Expression `,` `)`
    //   `(` `)`
    //   `(` `...` BindingIdentifier `)`
    //   `(` `...` BindingPattern `)`
    //   `(` Expression `,` `...` BindingIdentifier `)`
    //   `(` Expression `.` `...` BindingPattern `)`


    parseCoverParenthesizedExpressionAndArrowParameterList() {
      const node = this.startNode();
      const commaOp = this.startNode();
      this.expect(Token.LPAREN);

      if (this.test(Token.RPAREN)) {
        if (!this.testAhead(Token.ARROW) || this.peekAhead().hadLineTerminatorBefore) {
          this.unexpected();
        }

        this.next();
        node.Arguments = [];
        return this.finishNode(node, 'CoverParenthesizedExpressionAndArrowParameterList');
      }

      this.scope.pushArrowInfo();
      this.scope.pushAssignmentInfo('arrow');
      const expressions = [];
      let rparenAfterComma;

      while (true) {
        if (this.test(Token.ELLIPSIS)) {
          const inner = this.startNode();
          this.next();

          switch (this.peek().type) {
            case Token.LBRACE:
            case Token.LBRACK:
              inner.BindingPattern = this.parseBindingPattern();
              break;

            default:
              inner.BindingIdentifier = this.parseBindingIdentifier();
              break;
          }

          expressions.push(this.finishNode(inner, 'BindingRestElement'));
          this.expect(Token.RPAREN);
          break;
        }

        expressions.push(this.parseAssignmentExpression());

        if (this.eat(Token.COMMA)) {
          if (this.eat(Token.RPAREN)) {
            rparenAfterComma = this.currentToken;
            break;
          }
        } else {
          this.expect(Token.RPAREN);
          break;
        }
      }

      const arrowInfo = this.scope.popArrowInfo();
      const assignmentInfo = this.scope.popAssignmentInfo(); // ArrowParameters :
      //   CoverParenthesizedExpressionAndArrowParameterList

      if (this.test(Token.ARROW) && !this.peek().hadLineTerminatorBefore) {
        node.Arguments = expressions;
        node.arrowInfo = arrowInfo;
        assignmentInfo.clear();
        return this.finishNode(node, 'CoverParenthesizedExpressionAndArrowParameterList');
      } // ParenthesizedExpression :
      //   `(` Expression `)`


      if (expressions[expressions.length - 1].type === 'BindingRestElement') {
        this.unexpected(expressions[expressions.length - 1]);
      }

      if (rparenAfterComma) {
        this.unexpected(rparenAfterComma);
      }

      if (expressions.length === 1) {
        node.Expression = expressions[0];
      } else {
        commaOp.ExpressionList = expressions;
        node.Expression = this.finishNode(commaOp, 'CommaOperator');
      }

      return this.finishNode(node, 'ParenthesizedExpression');
    } // PropertyName :
    //   LiteralPropertyName
    //   ComputedPropertyName
    // LiteralPropertyName :
    //   IdentifierName
    //   StringLiteral
    //   NumericLiteral
    // ComputedPropertyName :
    //   `[` AssignmentExpression `]`


    parsePropertyName() {
      if (this.test(Token.LBRACK)) {
        const node = this.startNode();
        this.next();
        node.ComputedPropertyName = this.parseAssignmentExpression();
        this.expect(Token.RBRACK);
        return this.finishNode(node, 'PropertyName');
      }

      if (this.test(Token.STRING)) {
        return this.parseStringLiteral();
      }

      if (this.test(Token.NUMBER) || this.test(Token.BIGINT)) {
        return this.parseNumericLiteral();
      }

      return this.parseIdentifierName();
    } // PropertyDefinition :
    //   IdentifierReference
    //   CoverInitializedName
    //   PropertyName `:` AssignmentExpression
    //   MethodDefinition
    //   `...` AssignmentExpression
    // MethodDefinition :
    //   PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
    //   GeneratorMethod
    //   AsyncMethod
    //   AsyncGeneratorMethod
    //   `get` PropertyName `(` `)` `{` FunctionBody `}`
    //   `set` PropertyName `(` PropertySetParameterList `)` `{` FunctionBody `}`
    // GeneratorMethod :
    //   `*` PropertyName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`
    // AsyncMethod :
    //   `async` [no LineTerminator here] PropertyName `(` UniqueFormalParameters `)` `{` AsyncFunctionBody `}`
    // AsyncGeneratorMethod :
    //   `async` [no LineTerminator here] `*` Propertyname `(` UniqueFormalParameters `)` `{` AsyncGeneratorBody `}`


    parseBracketedDefinition(type, isStatic = false) {
      const node = this.startNode();

      if (type === 'property' && this.eat(Token.ELLIPSIS)) {
        node.PropertyName = null;
        node.AssignmentExpression = this.parseAssignmentExpression();
        return this.finishNode(node, 'PropertyDefinition');
      }

      let isGenerator = this.eat(Token.MUL);
      let isGetter = false;
      let isSetter = false;
      let isAsync = false;

      if (!isGenerator) {
        if (this.test('get')) {
          isGetter = true;
        } else if (this.test('set')) {
          isSetter = true;
        } else if (this.test('async') && !this.peekAhead().hadLineTerminatorBefore) {
          isAsync = true;
        }
      }

      const firstName = this.parsePropertyName();

      if (!isGenerator && !isGetter && !isSetter) {
        isGenerator = this.eat(Token.MUL);
      }

      const isSpecialMethod = isGenerator || (isSetter || isGetter || isAsync) && !this.test(Token.LPAREN);

      if (!isGenerator && type === 'property') {
        if (this.eat(Token.COLON)) {
          node.PropertyName = firstName;
          node.AssignmentExpression = this.parseAssignmentExpression();
          return this.finishNode(node, 'PropertyDefinition');
        }

        if (this.scope.assignmentInfoStack.length > 0 && this.test(Token.ASSIGN)) {
          node.IdentifierReference = firstName;
          node.IdentifierReference.type = 'IdentifierReference';
          node.Initializer = this.parseInitializerOpt();
          this.finishNode(node, 'CoverInitializedName');
          this.scope.registerObjectLiteralEarlyError(this.raiseEarly('UnexpectedToken', node));
          return node;
        }

        if (!isSpecialMethod && firstName.type === 'IdentifierName' && !this.test(Token.LPAREN) && !isKeyword(firstName.name)) {
          firstName.type = 'IdentifierReference';
          this.validateIdentifierReference(firstName.name, firstName);
          return firstName;
        }
      }

      node.PropertyName = isSpecialMethod && (!isGenerator || isAsync) ? this.parsePropertyName() : firstName;
      this.scope.with({
        lexical: true,
        variable: true,
        superProperty: true,
        await: isAsync,
        yield: isGenerator
      }, () => {
        if (isSpecialMethod && isGetter) {
          this.expect(Token.LPAREN);
          this.expect(Token.RPAREN);
          node.PropertySetParameterList = null;
          node.UniqueFormalParameters = null;
        } else if (isSpecialMethod && isSetter) {
          this.expect(Token.LPAREN);
          node.PropertySetParameterList = [this.parseFormalParameter()];
          this.expect(Token.RPAREN);
          node.UniqueFormalParameters = null;
        } else {
          node.PropertySetParameterList = null;
          node.UniqueFormalParameters = this.parseUniqueFormalParameters();
        }

        this.scope.with({
          superCall: !isSpecialMethod && !isStatic && (node.PropertyName.name === 'constructor' || node.PropertyName.value === 'constructor') && this.scope.hasSuperCall()
        }, () => {
          const body = this.parseFunctionBody(isAsync, isGenerator, false);
          node[`${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}Body`] = body;

          if (node.UniqueFormalParameters || node.PropertySetParameterList) {
            this.validateFormalParameters(node.UniqueFormalParameters || node.PropertySetParameterList, body, true);
          }
        });
      });
      const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : ''}Method${isAsync || isGenerator ? '' : 'Definition'}`;
      return this.finishNode(node, name);
    }

  }

  class StatementParser extends ExpressionParser {
    semicolon() {
      if (this.eat(Token.SEMICOLON)) {
        return;
      }

      if (this.peek().hadLineTerminatorBefore || isAutomaticSemicolon(this.peek().type)) {
        return;
      }

      this.unexpected();
    } // StatementList :
    //   StatementListItem
    //   StatementList StatementListItem


    parseStatementList(endToken, directives) {
      const statementList = [];
      const oldStrict = this.state.strict;
      const directiveData = [];

      while (!this.eat(endToken)) {
        if (directives !== undefined && this.test(Token.STRING)) {
          const token = this.peek();
          const directive = this.source.slice(token.startIndex + 1, token.endIndex - 1);

          if (directive === 'use strict') {
            this.state.strict = true;
            directiveData.forEach(d => {
              if (/\\([1-9]|0\d)/.test(d.directive)) {
                this.raiseEarly('IllegalOctalEscape', d.token);
              }
            });
          }

          directives.push(directive);
          directiveData.push({
            directive,
            token
          });
        } else {
          directives = undefined;
        }

        const stmt = this.parseStatementListItem();
        statementList.push(stmt);
      }

      this.state.strict = oldStrict;
      return statementList;
    } // StatementListItem :
    //   Statement
    //   Declaration
    //
    // Declaration :
    //   HoistableDeclaration
    //   ClassDeclaration
    //   LexicalDeclaration


    parseStatementListItem() {
      switch (this.peek().type) {
        case Token.FUNCTION:
          return this.parseHoistableDeclaration();

        case Token.CLASS:
          return this.parseClassDeclaration();

        case Token.CONST:
          return this.parseLexicalDeclaration();

        default:
          if (this.test('let')) {
            switch (this.peekAhead().type) {
              case Token.LBRACE:
              case Token.LBRACK:
              case Token.IDENTIFIER:
              case Token.YIELD:
              case Token.AWAIT:
                return this.parseLexicalDeclaration();
            }
          }

          if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
            return this.parseHoistableDeclaration();
          }

          return this.parseStatement();
      }
    } // HoistableDeclaration :
    //   FunctionDeclaration
    //   GeneratorDeclaration
    //   AsyncFunctionDeclaration
    //   AsyncGeneratorDeclaration


    parseHoistableDeclaration() {
      switch (this.peek().type) {
        case Token.FUNCTION:
          return this.parseFunctionDeclaration(FunctionKind.NORMAL);

        default:
          if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
            return this.parseFunctionDeclaration(FunctionKind.ASYNC);
          }

          throw new Error('unreachable');
      }
    } // ClassDeclaration :
    //   `class` BindingIdentifier ClassTail
    //   [+Default] `class` ClassTail


    parseClassDeclaration() {
      return this.parseClass(false);
    } // LexicalDeclaration : LetOrConst BindingList `;`


    parseLexicalDeclaration() {
      const node = this.startNode();
      const letOrConst = this.eat('let') || this.expect(Token.CONST);
      node.LetOrConst = letOrConst.type === Token.CONST ? 'const' : 'let';
      node.BindingList = this.parseBindingList();
      this.semicolon();
      this.scope.declare(node.BindingList, 'lexical');
      node.BindingList.forEach(b => {
        if (node.LetOrConst === 'const' && !b.Initializer) {
          this.raiseEarly('ConstDeclarationMissingInitializer', b);
        }
      });
      return this.finishNode(node, 'LexicalDeclaration');
    } // BindingList :
    //   LexicalBinding
    //   BindingList `,` LexicalBinding
    //
    // LexicalBinding :
    //   BindingIdentifier Initializer?
    //   BindingPattern Initializer


    parseBindingList() {
      const bindingList = [];

      do {
        const node = this.parseBindingElement();
        node.type = 'LexicalBinding';
        bindingList.push(node);
      } while (this.eat(Token.COMMA));

      return bindingList;
    } // BindingElement :
    //   SingleNameBinding
    //   BindingPattern Initializer?
    // SingleNameBinding :
    //   BindingIdentifier Initializer?


    parseBindingElement() {
      const node = this.startNode();

      if (this.test(Token.LBRACE) || this.test(Token.LBRACK)) {
        node.BindingPattern = this.parseBindingPattern();
      } else {
        node.BindingIdentifier = this.parseBindingIdentifier();
      }

      node.Initializer = this.parseInitializerOpt();
      return this.finishNode(node, node.BindingPattern ? 'BindingElement' : 'SingleNameBinding');
    } // BindingPattern:
    //   ObjectBindingPattern
    //   ArrayBindingPattern


    parseBindingPattern() {
      switch (this.peek().type) {
        case Token.LBRACE:
          return this.parseObjectBindingPattern();

        case Token.LBRACK:
          return this.parseArrayBindingPattern();

        default:
          return this.unexpected();
      }
    } // ObjectBindingPattern :
    //   `{` `}`
    //   `{` BindingRestProperty `}`
    //   `{` BindingPropertyList `}`
    //   `{` BindingPropertyList `,` BindingRestProperty? `}`


    parseObjectBindingPattern() {
      const node = this.startNode();
      this.expect(Token.LBRACE);
      node.BindingPropertyList = [];

      while (!this.eat(Token.RBRACE)) {
        if (this.test(Token.ELLIPSIS)) {
          node.BindingRestProperty = this.parseBindingRestProperty();
          this.expect(Token.RBRACE);
          break;
        } else {
          node.BindingPropertyList.push(this.parseBindingProperty());

          if (!this.eat(Token.COMMA)) {
            this.expect(Token.RBRACE);
            break;
          }
        }
      }

      return this.finishNode(node, 'ObjectBindingPattern');
    } // BindingProperty :
    //   SingleNameBinding
    //   PropertyName : BindingElement


    parseBindingProperty() {
      const node = this.startNode();
      const name = this.parsePropertyName();

      if (this.eat(Token.COLON)) {
        node.PropertyName = name;
        node.BindingElement = this.parseBindingElement();
        return this.finishNode(node, 'BindingProperty');
      }

      node.BindingIdentifier = name;

      if (name.type === 'IdentifierName') {
        name.type = 'BindingIdentifier';
      } else {
        this.unexpected(name);
      }

      node.Initializer = this.parseInitializerOpt();
      return this.finishNode(node, 'SingleNameBinding');
    } // BindingRestProperty :
    //  `...` BindingIdentifier


    parseBindingRestProperty() {
      const node = this.startNode();
      this.expect(Token.ELLIPSIS);
      node.BindingIdentifier = this.parseBindingIdentifier();
      return this.finishNode(node, 'BindingRestProperty');
    } // ArrayBindingPattern :
    //   `[` Elision? BindingRestElement `]`
    //   `[` BindingElementList `]`
    //   `[` BindingElementList `,` Elision? BindingRestElement `]`


    parseArrayBindingPattern() {
      const node = this.startNode();
      this.expect(Token.LBRACK);
      node.BindingElementList = [];

      while (true) {
        while (this.test(Token.COMMA)) {
          const elision = this.startNode();
          this.next();
          node.BindingElementList.push(this.finishNode(elision, 'Elision'));
        }

        if (this.eat(Token.RBRACK)) {
          break;
        }

        if (this.test(Token.ELLIPSIS)) {
          node.BindingRestElement = this.parseBindingRestElement();
          this.expect(Token.RBRACK);
          break;
        } else {
          node.BindingElementList.push(this.parseBindingElement());
        }

        if (this.eat(Token.RBRACK)) {
          break;
        }

        this.expect(Token.COMMA);
      }

      return this.finishNode(node, 'ArrayBindingPattern');
    } // BindingRestElement :
    //   `...` BindingIdentifier
    //   `...` BindingPattern


    parseBindingRestElement() {
      const node = this.startNode();
      this.expect(Token.ELLIPSIS);

      switch (this.peek().type) {
        case Token.LBRACE:
        case Token.LBRACK:
          node.BindingPattern = this.parseBindingPattern();
          break;

        default:
          node.BindingIdentifier = this.parseBindingIdentifier();
          break;
      }

      return this.finishNode(node, 'BindingRestElement');
    } // Initializer : `=` AssignmentExpression


    parseInitializerOpt() {
      if (this.eat(Token.ASSIGN)) {
        return this.parseAssignmentExpression();
      }

      return null;
    } // FunctionDeclaration


    parseFunctionDeclaration(kind) {
      return this.parseFunction(false, kind);
    } // Statement :
    //   ...


    parseStatement() {
      switch (this.peek().type) {
        case Token.LBRACE:
          return this.parseBlockStatement();

        case Token.VAR:
          return this.parseVariableStatement();

        case Token.SEMICOLON:
          {
            const node = this.startNode();
            this.next();
            return this.finishNode(node, 'EmptyStatement');
          }

        case Token.IF:
          return this.parseIfStatement();

        case Token.DO:
          return this.parseDoWhileStatement();

        case Token.WHILE:
          return this.parseWhileStatement();

        case Token.FOR:
          return this.parseForStatement();

        case Token.SWITCH:
          return this.parseSwitchStatement();

        case Token.CONTINUE:
        case Token.BREAK:
          return this.parseBreakContinueStatement();

        case Token.RETURN:
          return this.parseReturnStatement();

        case Token.WITH:
          return this.parseWithStatement();

        case Token.THROW:
          return this.parseThrowStatement();

        case Token.TRY:
          return this.parseTryStatement();

        case Token.DEBUGGER:
          return this.parseDebuggerStatement();

        default:
          return this.parseExpressionStatement();
      }
    } // BlockStatement : Block


    parseBlockStatement() {
      return this.parseBlock();
    } // Block : `{` StatementList `}`


    parseBlock(lexical = true) {
      const node = this.startNode();
      this.expect(Token.LBRACE);
      this.scope.with({
        lexical
      }, () => {
        node.StatementList = this.parseStatementList(Token.RBRACE);
      });
      return this.finishNode(node, 'Block');
    } // VariableStatement : `var` VariableDeclarationList `;`


    parseVariableStatement() {
      const node = this.startNode();
      this.expect(Token.VAR);
      node.VariableDeclarationList = this.parseVariableDeclarationList();
      this.semicolon();
      this.scope.declare(node.VariableDeclarationList, 'variable');
      return this.finishNode(node, 'VariableStatement');
    } // VariableDeclarationList :
    //   VariableDeclaration
    //   VariableDeclarationList `,` VariableDeclaration


    parseVariableDeclarationList(firstDeclarationRequiresInit = true) {
      const declarationList = [];

      do {
        const node = this.parseVariableDeclaration(firstDeclarationRequiresInit);
        declarationList.push(node);
      } while (this.eat(Token.COMMA));

      return declarationList;
    } // VariableDeclaration :
    //   BindingIdentifier Initializer?
    //   BindingPattern Initializer


    parseVariableDeclaration(firstDeclarationRequiresInit) {
      const node = this.startNode();

      switch (this.peek().type) {
        case Token.LBRACE:
        case Token.LBRACK:
          node.BindingPattern = this.parseBindingPattern();

          if (firstDeclarationRequiresInit) {
            this.expect(Token.ASSIGN);
            node.Initializer = this.parseAssignmentExpression();
          } else {
            node.Initializer = this.parseInitializerOpt();
          }

          break;

        default:
          node.BindingIdentifier = this.parseBindingIdentifier();
          node.Initializer = this.parseInitializerOpt();
          break;
      }

      return this.finishNode(node, 'VariableDeclaration');
    } // IfStatement :
    //  `if` `(` Expression `)` Statement `else` Statement
    //  `if` `(` Expression `)` Statement [lookahead != `else`]


    parseIfStatement() {
      const node = this.startNode();
      this.expect(Token.IF);
      this.expect(Token.LPAREN);
      node.Expression = this.parseExpression();
      this.expect(Token.RPAREN);
      node.Statement_a = this.parseStatement();

      if (this.eat(Token.ELSE)) {
        node.Statement_b = this.parseStatement();
      }

      return this.finishNode(node, 'IfStatement');
    } // `while` `(` Expression `)` Statement


    parseWhileStatement() {
      const node = this.startNode();
      this.expect(Token.WHILE);
      this.expect(Token.LPAREN);
      node.Expression = this.parseExpression();
      this.expect(Token.RPAREN);
      this.scope.with({
        label: 'loop'
      }, () => {
        node.Statement = this.parseStatement();
      });
      return this.finishNode(node, 'WhileStatement');
    } // `do` Statement `while` `(` Expression `)` `;`


    parseDoWhileStatement() {
      const node = this.startNode();
      this.expect(Token.DO);
      this.scope.with({
        label: 'loop'
      }, () => {
        node.Statement = this.parseStatement();
      });
      this.expect(Token.WHILE);
      this.expect(Token.LPAREN);
      node.Expression = this.parseExpression();
      this.expect(Token.RPAREN); // Semicolons are completely optional after a do-while, even without a newline

      this.eat(Token.SEMICOLON);
      return this.finishNode(node, 'DoWhileStatement');
    } // `for` `(` [lookahead != `let` `[`] Expression? `;` Expression? `;` Expression? `)` Statement
    // `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
    // `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement
    // `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
    // `for` `(` `var` ForBinding `in` Expression `)` Statement
    // `for` `(` ForDeclaration `in` Expression `)` Statement
    // `for` `(` [lookahead != { `let`, `async` `of` }] LeftHandSideExpression `of` AssignmentExpression `)` Statement
    // `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    // `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    // `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
    // `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    // `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    //
    // ForDeclaration : LetOrConst ForBinding


    parseForStatement() {
      return this.scope.with({
        lexical: true,
        label: 'loop'
      }, () => {
        const node = this.startNode();
        this.expect(Token.FOR);
        const isAwait = this.scope.hasAwait() && this.eat(Token.AWAIT);

        if (isAwait && !this.scope.hasReturn()) {
          this.state.hasTopLevelAwait = true;
        }

        this.expect(Token.LPAREN);

        if (isAwait && this.test(Token.SEMICOLON)) {
          this.unexpected();
        }

        if (this.eat(Token.SEMICOLON)) {
          if (!this.test(Token.SEMICOLON)) {
            node.Expression_b = this.parseExpression();
          }

          this.expect(Token.SEMICOLON);

          if (!this.test(Token.RPAREN)) {
            node.Expression_c = this.parseExpression();
          }

          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, 'ForStatement');
        }

        const isLexicalStart = () => {
          switch (this.peekAhead().type) {
            case Token.LBRACE:
            case Token.LBRACK:
            case Token.IDENTIFIER:
            case Token.YIELD:
            case Token.AWAIT:
              return true;

            default:
              return false;
          }
        };

        if ((this.test('let') || this.test(Token.CONST)) && isLexicalStart()) {
          const inner = this.startNode();

          if (this.eat('let')) {
            inner.LetOrConst = 'let';
          } else {
            this.expect(Token.CONST);
            inner.LetOrConst = 'const';
          }

          const list = this.parseBindingList();
          this.scope.declare(list, 'lexical');

          if (list.length > 1 || this.test(Token.SEMICOLON)) {
            inner.BindingList = list;
            node.LexicalDeclaration = this.finishNode(inner, 'LexicalDeclaration');
            this.expect(Token.SEMICOLON);

            if (!this.test(Token.SEMICOLON)) {
              node.Expression_a = this.parseExpression();
            }

            this.expect(Token.SEMICOLON);

            if (!this.test(Token.RPAREN)) {
              node.Expression_b = this.parseExpression();
            }

            this.expect(Token.RPAREN);
            node.Statement = this.parseStatement();
            return this.finishNode(node, 'ForStatement');
          }

          inner.ForBinding = list[0];
          inner.ForBinding.type = 'ForBinding';

          if (inner.ForBinding.Initializer) {
            this.unexpected(inner.ForBinding.Initializer);
          }

          node.ForDeclaration = this.finishNode(inner, 'ForDeclaration');
          getDeclarations(node.ForDeclaration).forEach(d => {
            if (d.name === 'let') {
              this.raiseEarly('UnexpectedToken', d.node);
            }
          });

          if (!isAwait && this.eat(Token.IN)) {
            node.Expression = this.parseExpression();
            this.expect(Token.RPAREN);
            node.Statement = this.parseStatement();
            return this.finishNode(node, 'ForInStatement');
          }

          this.expect('of');
          node.AssignmentExpression = this.parseAssignmentExpression();
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, isAwait ? 'ForAwaitStatement' : 'ForOfStatement');
        }

        if (this.eat(Token.VAR)) {
          if (isAwait) {
            node.ForBinding = this.parseForBinding();
            this.expect('of');
            node.AssignmentExpression = this.parseAssignmentExpression();
            this.expect(Token.RPAREN);
            node.Statement = this.parseStatement();
            return this.finishNode(node, 'ForAwaitStatement');
          }

          const list = this.parseVariableDeclarationList(false);

          if (list.length > 1 || this.test(Token.SEMICOLON)) {
            node.VariableDeclarationList = list;
            this.expect(Token.SEMICOLON);

            if (!this.test(Token.SEMICOLON)) {
              node.Expression_a = this.parseExpression();
            }

            this.expect(Token.SEMICOLON);

            if (!this.test(Token.RPAREN)) {
              node.Expression_b = this.parseExpression();
            }

            this.expect(Token.RPAREN);
            node.Statement = this.parseStatement();
            return this.finishNode(node, 'ForStatement');
          }

          node.ForBinding = list[0];
          node.ForBinding.type = 'ForBinding';

          if (node.ForBinding.Initializer) {
            this.unexpected(node.ForBinding.Initializer);
          }

          if (this.eat('of')) {
            node.AssignmentExpression = this.parseAssignmentExpression();
          } else {
            this.expect(Token.IN);
            node.Expression = this.parseExpression();
          }

          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, node.AssignmentExpression ? 'ForOfStatement' : 'ForInStatement');
        }

        this.scope.pushAssignmentInfo('for');
        const expression = this.scope.with({
          in: false
        }, () => this.parseExpression());

        const validateLHS = n => {
          if (n.type === 'AssignmentExpression') {
            this.raiseEarly('UnexpectedToken', n);
          } else {
            this.validateAssignmentTarget(n);
          }
        };

        const assignmentInfo = this.scope.popAssignmentInfo();

        if (!isAwait && this.eat(Token.IN)) {
          assignmentInfo.clear();
          validateLHS(expression);
          node.LeftHandSideExpression = expression;
          node.Expression = this.parseExpression();
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, 'ForInStatement');
        }

        if (!(expression.type === 'IdentifierReference' && expression.name === 'async') && this.eat('of')) {
          assignmentInfo.clear();
          validateLHS(expression);
          node.LeftHandSideExpression = expression;
          node.AssignmentExpression = this.parseAssignmentExpression();
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, isAwait ? 'ForAwaitStatement' : 'ForOfStatement');
        }

        node.Expression_a = expression;
        this.expect(Token.SEMICOLON);

        if (!this.test(Token.SEMICOLON)) {
          node.Expression_b = this.parseExpression();
        }

        this.expect(Token.SEMICOLON);

        if (!this.test(Token.RPAREN)) {
          node.Expression_c = this.parseExpression();
        }

        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, 'ForStatement');
      });
    } // ForBinding :
    //   BindingIdentifier
    //   BindingPattern


    parseForBinding() {
      const node = this.startNode();

      switch (this.peek().type) {
        case Token.LBRACE:
        case Token.LBRACK:
          node.BindingPattern = this.parseBindingPattern();
          break;

        default:
          node.BindingIdentifier = this.parseBindingIdentifier();
          break;
      }

      return this.finishNode(node, 'ForBinding');
    } // SwitchStatement :
    //   `switch` `(` Expression `)` CaseBlock


    parseSwitchStatement() {
      const node = this.startNode();
      this.expect(Token.SWITCH);
      this.expect(Token.LPAREN);
      node.Expression = this.parseExpression();
      this.expect(Token.RPAREN);
      this.scope.with({
        lexical: true,
        label: 'switch'
      }, () => {
        node.CaseBlock = this.parseCaseBlock();
      });
      return this.finishNode(node, 'SwitchStatement');
    } // CaseBlock :
    //   `{` CaseClauses? `}`
    //   `{` CaseClauses? DefaultClause CaseClauses? `}`
    // CaseClauses :
    //   CaseClause
    //   CaseClauses CauseClause
    // CaseClause :
    //   `case` Expression `:` StatementList?
    // DefaultClause :
    //   `default` `:` StatementList?


    parseCaseBlock() {
      const node = this.startNode();
      this.expect(Token.LBRACE);

      while (!this.eat(Token.RBRACE)) {
        switch (this.peek().type) {
          case Token.CASE:
          case Token.DEFAULT:
            {
              const inner = this.startNode();
              const t = this.next().type;

              if (t === Token.DEFAULT && node.DefaultClause) {
                this.unexpected();
              }

              if (t === Token.CASE) {
                inner.Expression = this.parseExpression();
              }

              this.expect(Token.COLON);

              while (!(this.test(Token.CASE) || this.test(Token.DEFAULT) || this.test(Token.RBRACE))) {
                if (!inner.StatementList) {
                  inner.StatementList = [];
                }

                inner.StatementList.push(this.parseStatementListItem());
              }

              if (t === Token.DEFAULT) {
                node.DefaultClause = this.finishNode(inner, 'DefaultClause');
              } else {
                if (node.DefaultClause) {
                  if (!node.CaseClauses_b) {
                    node.CaseClauses_b = [];
                  }

                  node.CaseClauses_b.push(this.finishNode(inner, 'CaseClause'));
                } else {
                  if (!node.CaseClauses_a) {
                    node.CaseClauses_a = [];
                  }

                  node.CaseClauses_a.push(this.finishNode(inner, 'CaseClause'));
                }
              }

              break;
            }

          default:
            this.unexpected();
        }
      }

      return this.finishNode(node, 'CaseBlock');
    } // BreakStatement :
    //   `break` `;`
    //   `break` [no LineTerminator here] LabelIdentifier `;`
    //
    // ContinueStatement :
    //   `continue` `;`
    //   `continue` [no LineTerminator here] LabelIdentifier `;`


    parseBreakContinueStatement() {
      const node = this.startNode();
      const isBreak = this.eat(Token.BREAK);

      if (!isBreak) {
        this.expect(Token.CONTINUE);
      }

      if (this.eat(Token.SEMICOLON)) {
        node.LabelIdentifier = null;
      } else if (this.peek().hadLineTerminatorBefore) {
        node.LabelIdentifier = null;
        this.semicolon();
      } else {
        if (this.test(Token.IDENTIFIER)) {
          node.LabelIdentifier = this.parseLabelIdentifier();
        } else {
          node.LabelIdentifier = null;
        }

        this.semicolon();
      }

      this.verifyBreakContinue(node, isBreak);
      return this.finishNode(node, isBreak ? 'BreakStatement' : 'ContinueStatement');
    }

    verifyBreakContinue(node, isBreak) {
      let i = 0;

      for (; i < this.scope.labels.length; i += 1) {
        const label = this.scope.labels[i];

        if (!node.LabelIdentifier || node.LabelIdentifier.name === label.name) {
          if (label.type && (isBreak || label.type === 'loop')) {
            break;
          }

          if (node.LabelIdentifier && isBreak) {
            break;
          }
        }
      }

      if (i === this.scope.labels.length) {
        this.raiseEarly('IllegalBreakContinue', node, isBreak);
      }
    } // ReturnStatement :
    //   `return` `;`
    //   `return` [no LineTerminator here] Expression `;`


    parseReturnStatement() {
      if (!this.scope.hasReturn()) {
        this.unexpected();
      }

      const node = this.startNode();
      this.expect(Token.RETURN);

      if (this.eat(Token.SEMICOLON)) {
        node.Expression = null;
      } else if (this.peek().hadLineTerminatorBefore) {
        node.Expression = null;
        this.semicolon();
      } else {
        node.Expression = this.parseExpression();
        this.semicolon();
      }

      return this.finishNode(node, 'ReturnStatement');
    } // WithStatement :
    //   `with` `(` Expression `)` Statement


    parseWithStatement() {
      if (this.isStrictMode()) {
        this.raiseEarly('UnexpectedToken');
      }

      const node = this.startNode();
      this.expect(Token.WITH);
      this.expect(Token.LPAREN);
      node.Expression = this.parseExpression();
      this.expect(Token.RPAREN);
      node.Statement = this.parseStatement();
      return this.finishNode(node, 'WithStatement');
    } // ThrowStatement :
    //   `throw` [no LineTerminator here] Expression `;`


    parseThrowStatement() {
      const node = this.startNode();
      this.expect(Token.THROW);

      if (this.peek().hadLineTerminatorBefore) {
        this.raise('NewlineAfterThrow', node);
      }

      node.Expression = this.parseExpression();
      this.semicolon();
      return this.finishNode(node, 'ThrowStatement');
    } // TryStatement :
    //   `try` Block Catch
    //   `try` Block Finally
    //   `try` Block Catch Finally
    //
    // Catch :
    //   `catch` `(` CatchParameter `)` Block
    //   `catch` Block
    //
    // Finally :
    //   `finally` Block
    //
    // CatchParameter :
    //   BindingIdentifier
    //   BindingPattern


    parseTryStatement() {
      const node = this.startNode();
      this.expect(Token.TRY);
      node.Block = this.parseBlock();

      if (this.eat(Token.CATCH)) {
        this.scope.with({
          lexical: true
        }, () => {
          const clause = this.startNode();

          if (this.eat(Token.LPAREN)) {
            switch (this.peek().type) {
              case Token.LBRACE:
              case Token.LBRACK:
                clause.CatchParameter = this.parseBindingPattern();
                break;

              default:
                clause.CatchParameter = this.parseBindingIdentifier();
                break;
            }

            this.scope.declare(clause.CatchParameter, 'lexical');
            this.expect(Token.RPAREN);
          } else {
            clause.CatchParameter = null;
          }

          clause.Block = this.parseBlock(false);
          node.Catch = this.finishNode(clause, 'Catch');
        });
      } else {
        node.Catch = null;
      }

      if (this.eat(Token.FINALLY)) {
        node.Finally = this.parseBlock();
      } else {
        node.Finally = null;
      }

      if (!node.Catch && !node.Finally) {
        this.raise('TryMissingCatchOrFinally');
      }

      return this.finishNode(node, 'TryStatement');
    } // DebuggerStatement : `debugger` `;`


    parseDebuggerStatement() {
      const node = this.startNode();
      this.expect(Token.DEBUGGER);
      this.semicolon();
      return this.finishNode(node, 'DebuggerStatement');
    } // ExpressionStatement :
    //   [lookahead != `{`, `function`, `async` [no LineTerminator here] `function`, `class`, `let` `[` ] Expression `;`


    parseExpressionStatement() {
      switch (this.peek().type) {
        case Token.LBRACE:
        case Token.FUNCTION:
        case Token.CLASS:
          this.unexpected();
          break;

        default:
          if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
            this.unexpected();
          }

          if (this.test('let') && this.testAhead(Token.LBRACK)) {
            this.unexpected();
          }

          break;
      }

      const startToken = this.peek();
      const node = this.startNode();
      const expression = this.parseExpression();

      if (expression.type === 'IdentifierReference' && this.eat(Token.COLON)) {
        expression.type = 'LabelIdentifier';
        node.LabelIdentifier = expression;

        if (this.scope.labels.find(l => l.name === node.LabelIdentifier.name)) {
          this.raiseEarly('AlreadyDeclared', node.LabelIdentifier, node.LabelIdentifier.name);
        }

        let type = null;

        switch (this.peek().type) {
          case Token.SWITCH:
            type = 'switch';
            break;

          case Token.DO:
          case Token.WHILE:
          case Token.FOR:
            type = 'loop';
            break;
        }

        if (type !== null && this.scope.labels.length > 0) {
          const last = this.scope.labels[this.scope.labels.length - 1];

          if (last.nextToken === startToken) {
            last.type = type;
          }
        }

        this.scope.labels.push({
          name: node.LabelIdentifier.name,
          type,
          nextToken: type === null ? this.peek() : null
        });
        node.LabelledItem = this.parseStatement();
        this.scope.labels.pop();
        return this.finishNode(node, 'LabelledStatement');
      }

      node.Expression = expression;
      this.semicolon();
      return this.finishNode(node, 'ExpressionStatement');
    } // ImportDeclaration :
    //   `import` ImportClause FromClause `;`
    //   `import` ModuleSpecifier `;`


    parseImportDeclaration() {
      if (this.testAhead(Token.PERIOD) || this.testAhead(Token.LPAREN)) {
        // `import` `(`
        // `import` `.`
        return this.parseExpressionStatement();
      }

      const node = this.startNode();
      this.next();

      if (this.test(Token.STRING)) {
        node.ModuleSpecifier = this.parsePrimaryExpression();
      } else {
        node.ImportClause = this.parseImportClause();
        this.scope.declare(node.ImportClause, 'import');
        node.FromClause = this.parseFromClause();
      }

      this.semicolon();
      return this.finishNode(node, 'ImportDeclaration');
    } // ImportClause :
    //   ImportedDefaultBinding
    //   NameSpaceImport
    //   NamedImports
    //   ImportedDefaultBinding `,` NameSpaceImport
    //   ImportedDefaultBinding `,` NamedImports
    //
    // ImportedBinding :
    //   BindingIdentifier


    parseImportClause() {
      const node = this.startNode();

      if (this.test(Token.IDENTIFIER)) {
        node.ImportedDefaultBinding = this.parseImportedDefaultBinding();

        if (!this.eat(Token.COMMA)) {
          return this.finishNode(node, 'ImportClause');
        }
      }

      if (this.test(Token.MUL)) {
        node.NameSpaceImport = this.parseNameSpaceImport();
      } else if (this.eat(Token.LBRACE)) {
        node.NamedImports = this.parseNamedImports();
      } else {
        this.unexpected();
      }

      return this.finishNode(node, 'ImportClause');
    } // ImportedDefaultBinding :
    //   ImportedBinding


    parseImportedDefaultBinding() {
      const node = this.startNode();
      node.ImportedBinding = this.parseBindingIdentifier();
      return this.finishNode(node, 'ImportedDefaultBinding');
    } // NameSpaceImport :
    //   `*` `as` ImportedBinding


    parseNameSpaceImport() {
      const node = this.startNode();
      this.expect(Token.MUL);
      this.expect('as');
      node.ImportedBinding = this.parseBindingIdentifier();
      return this.finishNode(node, 'NameSpaceImport');
    } // NamedImports :
    //   `{` `}`
    //   `{` ImportsList `}`
    //   `{` ImportsList `,` `}`


    parseNamedImports() {
      const node = this.startNode();
      node.ImportsList = [];

      while (!this.eat(Token.RBRACE)) {
        node.ImportsList.push(this.parseImportSpecifier());

        if (this.eat(Token.RBRACE)) {
          break;
        }

        this.expect(Token.COMMA);
      }

      return this.finishNode(node, 'NamedImports');
    } // ImportSpecifier :
    //   ImportedBinding
    //   IdentifierName `as` ImportedBinding
    //   ModuleExportName `as` ImportedBinding


    parseImportSpecifier() {
      const node = this.startNode();

      if (this.feature('arbitrary-module-namespace-names') && this.test(Token.STRING)) {
        node.ModuleExportName = this.parseModuleExportName();
        this.expect('as');
        node.ImportedBinding = this.parseBindingIdentifier();
      } else {
        const name = this.parseIdentifierName();

        if (this.eat('as')) {
          node.IdentifierName = name;
          node.ImportedBinding = this.parseBindingIdentifier();
        } else {
          node.ImportedBinding = name;
          node.ImportedBinding.type = 'BindingIdentifier';

          if (isKeywordRaw(node.ImportedBinding.name)) {
            this.raiseEarly('UnexpectedToken', node.ImportedBinding);
          }

          if (node.ImportedBinding.name === 'eval' || node.ImportedBinding.name === 'arguments') {
            this.raiseEarly('UnexpectedToken', node.ImportedBinding);
          }
        }
      }

      return this.finishNode(node, 'ImportSpecifier');
    } // ExportDeclaration :
    //   `export` ExportFromClause FromClause `;`
    //   `export` NamedExports `;`
    //   `export` VariableStatement
    //   `export` Declaration
    //   `export` `default` HoistableDeclaration
    //   `export` `default` ClassDeclaration
    //   `export` `default` AssignmentExpression `;`
    //
    // ExportFromClause :
    //   `*`
    //   `*` as IdentifierName
    //   `*` as ModuleExportName
    //   NamedExports


    parseExportDeclaration() {
      const node = this.startNode();
      this.expect(Token.EXPORT);
      node.default = this.eat(Token.DEFAULT);

      if (node.default) {
        switch (this.peek().type) {
          case Token.FUNCTION:
            node.HoistableDeclaration = this.scope.with({
              default: true
            }, () => this.parseFunctionDeclaration(FunctionKind.NORMAL));
            break;

          case Token.CLASS:
            node.ClassDeclaration = this.scope.with({
              default: true
            }, () => this.parseClassDeclaration());
            break;

          default:
            if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
              node.HoistableDeclaration = this.scope.with({
                default: true
              }, () => this.parseFunctionDeclaration(FunctionKind.ASYNC));
            } else {
              node.AssignmentExpression = this.parseAssignmentExpression();
              this.semicolon();
            }

            break;
        }

        if (this.scope.exports.has('default')) {
          this.raiseEarly('AlreadyDeclared', node);
        } else {
          this.scope.exports.add('default');
        }
      } else {
        switch (this.peek().type) {
          case Token.CONST:
            node.Declaration = this.parseLexicalDeclaration();
            this.scope.declare(node.Declaration, 'export');
            break;

          case Token.CLASS:
            node.Declaration = this.parseClassDeclaration();
            this.scope.declare(node.Declaration, 'export');
            break;

          case Token.FUNCTION:
            node.Declaration = this.parseHoistableDeclaration();
            this.scope.declare(node.Declaration, 'export');
            break;

          case Token.VAR:
            node.VariableStatement = this.parseVariableStatement();
            this.scope.declare(node.VariableStatement, 'export');
            break;

          case Token.LBRACE:
            {
              const NamedExports = this.parseNamedExports();

              if (this.test('from')) {
                node.ExportFromClause = NamedExports;
                node.FromClause = this.parseFromClause();
              } else {
                NamedExports.ExportsList.forEach(n => {
                  if (n.localName.type === 'StringLiteral') {
                    this.raiseEarly('UnexpectedToken', n.localName);
                  }
                });
                node.NamedExports = NamedExports;
                this.scope.checkUndefinedExports(node.NamedExports);
              }

              this.semicolon();
              break;
            }

          case Token.MUL:
            {
              const inner = this.startNode();
              this.next();

              if (this.eat('as')) {
                if (this.feature('arbitrary-module-namespace-names') && this.test(Token.STRING)) {
                  inner.ModuleExportName = this.parseModuleExportName();
                  this.scope.declare(inner.ModuleExportName, 'export');
                } else {
                  inner.IdentifierName = this.parseIdentifierName();
                  this.scope.declare(inner.IdentifierName, 'export');
                }
              }

              node.ExportFromClause = this.finishNode(inner, 'ExportFromClause');
              node.FromClause = this.parseFromClause();
              this.semicolon();
              break;
            }

          default:
            if (this.test('let')) {
              node.Declaration = this.parseLexicalDeclaration();
              this.scope.declare(node.Declaration, 'export');
            } else if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
              node.Declaration = this.parseHoistableDeclaration();
              this.scope.declare(node.Declaration, 'export');
            } else {
              this.unexpected();
            }

        }
      }

      return this.finishNode(node, 'ExportDeclaration');
    } // NamedExports :
    //   `{` `}`
    //   `{` ExportsList `}`
    //   `{` ExportsList `,` `}`


    parseNamedExports() {
      const node = this.startNode();
      this.expect(Token.LBRACE);
      node.ExportsList = [];

      while (!this.eat(Token.RBRACE)) {
        node.ExportsList.push(this.parseExportSpecifier());

        if (this.eat(Token.RBRACE)) {
          break;
        }

        this.expect(Token.COMMA);
      }

      return this.finishNode(node, 'NamedExports');
    } // ExportSpecifier :
    //   IdentifierName
    //   IdentifierName `as` IdentifierName
    //   IdentifierName `as` ModuleExportName
    //   ModuleExportName
    //   ModuleExportName `as` ModuleExportName
    //   ModuleExportName `as` IdentifierName


    parseExportSpecifier() {
      const node = this.startNode();

      const parseName = () => {
        if (this.feature('arbitrary-module-namespace-names') && this.test(Token.STRING)) {
          return this.parseModuleExportName();
        }

        return this.parseIdentifierName();
      };

      node.localName = parseName();

      if (this.eat('as')) {
        node.exportName = parseName();
      } else {
        node.exportName = node.localName;
      }

      this.scope.declare(node.exportName, 'export');
      return this.finishNode(node, 'ExportSpecifier');
    } // ModuleExportName : StringLiteral


    parseModuleExportName() {
      const literal = this.parseStringLiteral();

      if (!IsStringValidUnicode(StringValue(literal))) {
        this.raiseEarly('ModuleExportNameInvalidUnicode', literal);
      }

      return literal;
    } // FromClause :
    //   `from` ModuleSpecifier


    parseFromClause() {
      this.expect('from');
      return this.parseStringLiteral();
    }

  }

  class LanguageParser extends StatementParser {
    // Script : ScriptBody?
    parseScript() {
      if (this.feature('hashbang')) {
        this.skipHashbangComment();
      }

      const node = this.startNode();

      if (this.eat(Token.EOS)) {
        node.ScriptBody = null;
      } else {
        node.ScriptBody = this.parseScriptBody();
      }

      return this.finishNode(node, 'Script');
    } // ScriptBody : StatementList


    parseScriptBody() {
      const node = this.startNode();
      this.scope.with({
        in: true,
        lexical: true,
        variable: true,
        variableFunctions: true
      }, () => {
        const directives = [];
        node.StatementList = this.parseStatementList(Token.EOS, directives);
        node.strict = directives.includes('use strict');
      });
      return this.finishNode(node, 'ScriptBody');
    } // Module : ModuleBody?


    parseModule() {
      if (this.feature('hashbang')) {
        this.skipHashbangComment();
      }

      return this.scope.with({
        module: true,
        strict: true,
        in: true,
        importMeta: true,
        await: this.feature('top-level-await'),
        lexical: true,
        variable: true
      }, () => {
        const node = this.startNode();

        if (this.eat(Token.EOS)) {
          node.ModuleBody = null;
        } else {
          node.ModuleBody = this.parseModuleBody();
        }

        this.scope.undefinedExports.forEach((importNode, name) => {
          this.raiseEarly('ModuleUndefinedExport', importNode, name);
        });
        node.hasTopLevelAwait = this.state.hasTopLevelAwait;
        return this.finishNode(node, 'Module');
      });
    } // ModuleBody :
    //   ModuleItemList


    parseModuleBody() {
      const node = this.startNode();
      node.ModuleItemList = this.parseModuleItemList();
      return this.finishNode(node, 'ModuleBody');
    } // ModuleItemList :
    //   ModuleItem
    //   ModuleItemList ModuleItem
    //
    // ModuleItem :
    //   ImportDeclaration
    //   ExportDeclaration
    //   StatementListItem


    parseModuleItemList() {
      const moduleItemList = [];

      while (!this.eat(Token.EOS)) {
        switch (this.peek().type) {
          case Token.IMPORT:
            moduleItemList.push(this.parseImportDeclaration());
            break;

          case Token.EXPORT:
            moduleItemList.push(this.parseExportDeclaration());
            break;

          default:
            moduleItemList.push(this.parseStatementListItem());
            break;
        }
      }

      return moduleItemList;
    }

  }

  class Parser extends LanguageParser {
    constructor({
      source,
      specifier,
      json = false
    }) {
      super();
      this.source = source;
      this.specifier = specifier;
      this.earlyErrors = new Set();
      this.state = {
        hasTopLevelAwait: false,
        strict: false,
        json
      };
      this.scope = new Scope(this);
    }

    isStrictMode() {
      return this.state.strict;
    }

    feature(name) {
      // eslint-disable-next-line @engine262/valid-feature
      return exports.surroundingAgent.feature(name);
    }

    startNode(inheritStart = undefined) {
      this.peek();
      const node = {
        type: undefined,
        location: {
          startIndex: inheritStart ? inheritStart.location.startIndex : this.peekToken.startIndex,
          endIndex: -1,
          start: inheritStart ? { ...inheritStart.location.start
          } : {
            line: this.peekToken.line,
            column: this.peekToken.column
          },
          end: {
            line: -1,
            column: -1
          }
        },
        strict: this.state.strict,
        sourceText: () => this.source.slice(node.location.startIndex, node.location.endIndex)
      };
      return node;
    }

    finishNode(node, type) {
      node.type = type;
      node.location.endIndex = this.currentToken.endIndex;
      node.location.end.line = this.currentToken.line;
      node.location.end.column = this.currentToken.column;
      return node;
    }

    createSyntaxError(context = this.peek(), template, templateArgs) {
      if (template === 'UnexpectedToken' && context.type === Token.EOS) {
        template = 'UnexpectedEOS';
      }

      let startIndex;
      let endIndex;
      let line;
      let column;

      if (typeof context === 'number') {
        line = this.line;

        if (context === this.source.length) {
          while (isLineTerminator(this.source[context - 1])) {
            line -= 1;
            context -= 1;
          }
        }

        startIndex = context;
        endIndex = context + 1;
      } else if (context.type === Token.EOS) {
        line = this.line;
        startIndex = context.startIndex;

        while (isLineTerminator(this.source[startIndex - 1])) {
          line -= 1;
          startIndex -= 1;
        }

        endIndex = startIndex + 1;
      } else {
        if (context.location) {
          context = context.location;
        }

        ({
          startIndex,
          endIndex,
          start: {
            line,
            column
          } = context
        } = context);
      }
      /*
       * Source looks like:
       *
       *  const a = 1;
       *  const b 'string string string'; // a string
       *  const c = 3;                  |            |
       *  |       |                     |            |
       *  |       | startIndex          | endIndex   |
       *  | lineStart                                | lineEnd
       *
       * Exception looks like:
       *
       *  const b 'string string string'; // a string
       *          ^^^^^^^^^^^^^^^^^^^^^^
       *  SyntaxError: unexpected token
       */


      let lineStart = startIndex;

      while (!isLineTerminator(this.source[lineStart - 1]) && this.source[lineStart - 1] !== undefined) {
        lineStart -= 1;
      }

      let lineEnd = startIndex;

      while (!isLineTerminator(this.source[lineEnd]) && this.source[lineEnd] !== undefined) {
        lineEnd += 1;
      }

      if (column === undefined) {
        column = startIndex - lineStart + 1;
      }

      const e = new SyntaxError(messages[template](...templateArgs));
      e.decoration = `\
${this.specifier ? `${this.specifier}:${line}:${column}\n` : ''}${this.source.slice(lineStart, lineEnd)}
${' '.repeat(startIndex - lineStart)}${'^'.repeat(Math.max(endIndex - startIndex, 1))}`;
      return e;
    }

    raiseEarly(template, context, ...templateArgs) {
      const e = this.createSyntaxError(context, template, templateArgs);
      this.earlyErrors.add(e);
      return e;
    }

    raise(template, context, ...templateArgs) {
      const e = this.createSyntaxError(context, template, templateArgs);
      throw e;
    }

    unexpected(...args) {
      return this.raise('UnexpectedToken', ...args);
    }

  }

  function parseMethodDefinition(sourceText) {
    const parser = new Parser({
      source: sourceText
    });
    return parser.scope.with({
      superCall: true
    }, () => parser.parseMethodDefinition());
  } // ClassTail : ClassHeritage? `{` ClassBody? `}`


  function* ClassDefinitionEvaluation(ClassTail, classBinding, className) {
    const {
      ClassHeritage,
      ClassBody
    } = ClassTail; // 1. Let env be the LexicalEnvironment of the running execution context.

    const env = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let classScope be NewDeclarativeEnvironment(env).

    const classScope = NewDeclarativeEnvironment(env); // 3. If classBinding is not undefined, then

    if (classBinding !== Value.undefined) {
      // a. Perform classScopeEnv.CreateImmutableBinding(classBinding, true).
      classScope.CreateImmutableBinding(classBinding, Value.true);
    }

    let protoParent;
    let constructorParent; // 4. If ClassHeritage is not present, then

    if (!ClassHeritage) {
      // a. Let protoParent be %Object.prototype%.
      protoParent = exports.surroundingAgent.intrinsic('%Object.prototype%'); // b. Let constructorParent be %Function.prototype%.

      constructorParent = exports.surroundingAgent.intrinsic('%Function.prototype%');
    } else {
      // 5. Else,
      // a. Set the running execution context's LexicalEnvironment to classScope.
      exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope; // b. Let superclassRef be the result of evaluating ClassHeritage.

      const superclassRef = yield* Evaluate(ClassHeritage); // c. Set the running execution context's LexicalEnvironment to env.

      exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = env; // d. Let superclass be ? GetValue(superclassRef).

      let _temp = GetValue(superclassRef);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      const superclass = _temp; // e. If superclass is null, then

      if (superclass === Value.null) {
        // i. Let protoParent be null.
        protoParent = Value.null; // ii. Let constructorParent be %Function.prototype%.

        constructorParent = exports.surroundingAgent.intrinsic('%Function.prototype%');
      } else if (IsConstructor(superclass) === Value.false) {
        // f. Else if IsConstructor(superclass) is false, throw a TypeError exception.
        return exports.surroundingAgent.Throw('TypeError', 'NotAConstructor', superclass);
      } else {
        let _temp2 = Get(superclass, new Value('prototype'));

        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }

        // g. Else,
        // i. Let protoParent be ? Get(superclass, "prototype").
        protoParent = _temp2; // ii. If Type(protoParent) is neither Object nor Null, throw a TypeError exception.

        if (Type(protoParent) !== 'Object' && Type(protoParent) !== 'Null') {
          return exports.surroundingAgent.Throw('TypeError', 'ObjectPrototypeType');
        } // iii. Let constructorParent be superclass.


        constructorParent = superclass;
      }
    } // 6. Let proto be OrdinaryObjectCreate(protoParent).


    const proto = OrdinaryObjectCreate(protoParent);
    let constructor; // 7. If ClassBody is not present, let constructor be empty.

    if (!ClassBody) {
      constructor = undefined;
    } else {
      // 8. Else, let constructor be ConstructorMethod of ClassBody.
      constructor = ConstructorMethod(ClassBody);
    } // 9. If constructor is empty, then


    if (constructor === undefined) {
      // a. If ClassHeritage is present, then
      if (ClassHeritage) {
        // i. Set constructor to the result of parsing the source text
        //    `constructor(...args) { super(...args); } using the syntactic grammar with the goal
        //    symbol MethodDefinition[~Yield, ~Await].
        constructor = parseMethodDefinition('constructor(...args) { super(...args); }');
      } else {
        // b. Else,
        // i. Set constructor to the result of parsing the source text `constructor() {}` using the
        //    syntactic grammar with the goal symbol MethodDefinition[~Yield, ~Await].
        constructor = parseMethodDefinition('constructor() {}');
      }
    } // 10. Set the running execution context's LexicalEnvironment to classScope.


    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope; // 11. Let constructorInfo be ! DefineMethod of constructor with arguments proto and constructorParent.

    let _temp3 = yield* DefineMethod(constructor, proto, constructorParent);

    Assert(!(_temp3 instanceof AbruptCompletion), "yield* DefineMethod(constructor, proto, constructorParent)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const constructorInfo = _temp3; // 12. Let F be constructorInfo.[[Closure]].

    const F = constructorInfo.Closure; // 13. Perform SetFunctionName(F, className).

    SetFunctionName(F, className); // 14. Perform MakeConstructor(F, false, proto).

    MakeConstructor(F, Value.false, proto); // 15. If ClassHeritage is present, set F.[[ConstructorKind]] to derived.

    if (ClassHeritage) {
      F.ConstructorKind = 'derived';
    } // 16. Perform MakeClassConstructor(F).


    MakeClassConstructor(F); // 17. Perform CreateMethodProperty(proto, "constructor", F).

    let _temp4 = CreateMethodProperty(proto, new Value('constructor'), F);

    Assert(!(_temp4 instanceof AbruptCompletion), "CreateMethodProperty(proto, new Value('constructor'), F)" + ' returned an abrupt completion');

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    let methods;

    if (!ClassBody) {
      methods = [];
    } else {
      // 19. Else, let methods be NonConstructorMethodDefinitions of ClassBody.
      methods = NonConstructorMethodDefinitions(ClassBody);
    } // 20. For each ClassElement m in order from methods, do


    for (const m of methods) {
      let status; // a. If IsStatic of m is false, then

      if (IsStatic(m) === false) {
        // i. Let status be PropertyDefinitionEvaluation of m with arguments proto and false.
        status = yield* PropertyDefinitionEvaluation(m, proto, Value.false);
      } else {
        // b. Else,
        // i. Let status be PropertyDefinitionEvaluation of m with arguments F and false.
        status = yield* PropertyDefinitionEvaluation(m, F, Value.false);
      } // c. If status is an abrupt completion, then


      if (status instanceof AbruptCompletion) {
        // i. Set the running execution context's LexicalEnvironment to env.
        exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = env; // ii. Return Completion(status).

        return Completion(status);
      }
    } // 21. Set the running execution context's LexicalEnvironment to env.


    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = env; // 22. If classBinding is not undefined, then

    if (classBinding !== Value.undefined) {
      // a. Perform classScope.InitializeBinding(classBinding, F).
      classScope.InitializeBinding(classBinding, F);
    } // 23. Return F.


    return F;
  }

  function* DefineMethod_MethodDefinition(MethodDefinition, object, functionPrototype) {
    const {
      PropertyName,
      UniqueFormalParameters,
      FunctionBody
    } = MethodDefinition; // 1. Let propKey be the result of evaluating PropertyName.

    let propKey = yield* Evaluate_PropertyName(PropertyName); // 2. ReturnIfAbrupt(propKey).

    /* istanbul ignore if */
    if (propKey instanceof AbruptCompletion) {
      return propKey;
    }
    /* istanbul ignore if */


    if (propKey instanceof Completion) {
      propKey = propKey.Value;
    }

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment;
    let prototype; // 4. If functionPrototype is present as a parameter, then

    if (functionPrototype !== undefined) {
      // a. Let prototype be functionPrototype.
      prototype = functionPrototype;
    } else {
      // 5. Else,
      // a. Let prototype be %Function.prototype%.
      prototype = exports.surroundingAgent.intrinsic('%Function.prototype%');
    } // 6. Let sourceText be the source text matched by MethodDefinition.


    const sourceText = sourceTextMatchedBy(MethodDefinition); // 7. Let closure be OrdinaryFunctionCreate(prototype, sourceText, UniqueFormalParameters, FunctionBody, non-lexical-this, scope).

    const closure = OrdinaryFunctionCreate(prototype, sourceText, UniqueFormalParameters, FunctionBody, 'non-lexical-this', scope); // 8. Perform MakeMethod(closure, object).

    MakeMethod(closure, object); // 9. Return the Record { [[Key]]: propKey, [[Closure]]: closure }.

    return {
      Key: propKey,
      Closure: closure
    };
  }

  DefineMethod_MethodDefinition.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-definemethod';
  function DefineMethod(node, object, functionPrototype) {
    switch (node.type) {
      case 'MethodDefinition':
        return DefineMethod_MethodDefinition(node, object, functionPrototype);

      case 'ClassElement':
        return DefineMethod(node.MethodDefinition, object, functionPrototype);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('DefineMethod', node);
    }
  }

  // PropertyName :
  //   LiteralPropertyName
  //   ComputedPropertyName
  // LiteralPropertyName :
  //   IdentifierName
  //   StringLiteral
  //   NumericLiteral
  // ComputedPropertyName :
  //   `[` AssignmentExpression `]`

  function* Evaluate_PropertyName(PropertyName) {
    switch (PropertyName.type) {
      case 'IdentifierName':
        return StringValue(PropertyName);

      case 'StringLiteral':
        return new Value(PropertyName.value);

      case 'NumericLiteral':
        {
          // 1. Let nbr be the NumericValue of NumericLiteral.
          const nbr = NumericValue(PropertyName); // 2. Return ! ToString(nbr).

          let _temp = ToString(nbr);

          Assert(!(_temp instanceof AbruptCompletion), "ToString(nbr)" + ' returned an abrupt completion');
          /* istanbul ignore if */

          if (_temp instanceof Completion) {
            _temp = _temp.Value;
          }

          return _temp;
        }

      default:
        {
          // 1. Let exprValue be the result of evaluating AssignmentExpression.
          const exprValue = yield* Evaluate(PropertyName.ComputedPropertyName); // 2. Let propName be ? GetValue(exprValue).

          let _temp2 = GetValue(exprValue);
          /* istanbul ignore if */


          if (_temp2 instanceof AbruptCompletion) {
            return _temp2;
          }
          /* istanbul ignore if */


          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }

          const propName = _temp2; // 3. Return ? ToPropertyKey(propName).

          return ToPropertyKey(propName);
        }
    }
  }

  //   AdditiveExpression : AdditiveExpression + MultiplicativeExpression

  function* Evaluate_AdditiveExpression_Plus({
    AdditiveExpression,
    MultiplicativeExpression
  }) {
    // 1. Return ? EvaluateStringOrNumericBinaryExpression(AdditiveExpression, +, MultiplicativeExpression).
    return yield* EvaluateStringOrNumericBinaryExpression(AdditiveExpression, '+', MultiplicativeExpression);
  } // #sec-subtraction-operator-minus-runtime-semantics-evaluation


  Evaluate_AdditiveExpression_Plus.section = 'https://tc39.es/ecma262/#sec-addition-operator-plus-runtime-semantics-evaluation';

  function* Evaluate_AdditiveExpression_Minus({
    AdditiveExpression,
    MultiplicativeExpression
  }) {
    // 1. Return ? EvaluateStringOrNumericBinaryExpression(AdditiveExpression, -, MultiplicativeExpression).
    return yield* EvaluateStringOrNumericBinaryExpression(AdditiveExpression, '-', MultiplicativeExpression);
  }

  Evaluate_AdditiveExpression_Minus.section = 'https://tc39.es/ecma262/#sec-subtraction-operator-minus-runtime-semantics-evaluation';
  function* Evaluate_AdditiveExpression(AdditiveExpression) {
    switch (AdditiveExpression.operator) {
      case '+':
        return yield* Evaluate_AdditiveExpression_Plus(AdditiveExpression);

      case '-':
        return yield* Evaluate_AdditiveExpression_Minus(AdditiveExpression);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_AdditiveExpression', AdditiveExpression);
    }
  }

  function refineLeftHandSideExpression(node, type) {
    switch (node.type) {
      case 'ArrayLiteral':
        {
          const refinement = {
            type: 'ArrayAssignmentPattern',
            AssignmentElementList: [],
            AssignmentRestElement: undefined
          };
          node.ElementList.forEach(n => {
            switch (n.type) {
              case 'SpreadElement':
                refinement.AssignmentRestElement = {
                  type: 'AssignmentRestElement',
                  DestructuringAssignmentTarget: n.AssignmentExpression
                };
                break;

              case 'ArrayLiteral':
              case 'ObjectLiteral':
                refinement.AssignmentElementList.push({
                  type: 'AssignmentElement',
                  DestructuringAssignmentTarget: n,
                  Initializer: null
                });
                break;

              default:
                refinement.AssignmentElementList.push(refineLeftHandSideExpression(n, 'array'));
                break;
            }
          });
          return refinement;
        }

      case 'ObjectLiteral':
        {
          const refined = {
            type: 'ObjectAssignmentPattern',
            AssignmentPropertyList: [],
            AssignmentRestProperty: undefined
          };
          node.PropertyDefinitionList.forEach(p => {
            if (p.PropertyName === null && p.AssignmentExpression) {
              refined.AssignmentRestProperty = {
                type: 'AssignmentRestProperty',
                DestructuringAssignmentTarget: p.AssignmentExpression
              };
            } else {
              refined.AssignmentPropertyList.push(refineLeftHandSideExpression(p, 'object'));
            }
          });
          return refined;
        }

      case 'PropertyDefinition':
        return {
          type: 'AssignmentProperty',
          PropertyName: node.PropertyName,
          AssignmentElement: node.AssignmentExpression.type === 'AssignmentExpression' ? {
            type: 'AssignmentElement',
            DestructuringAssignmentTarget: node.AssignmentExpression.LeftHandSideExpression,
            Initializer: node.AssignmentExpression.AssignmentExpression
          } : {
            type: 'AssignmentElement',
            DestructuringAssignmentTarget: node.AssignmentExpression,
            Initializer: undefined
          }
        };

      case 'IdentifierReference':
        if (type === 'array') {
          return {
            type: 'AssignmentElement',
            DestructuringAssignmentTarget: node,
            Initializer: undefined
          };
        } else {
          return {
            type: 'AssignmentProperty',
            IdentifierReference: node,
            Initializer: undefined
          };
        }

      case 'MemberExpression':
        return {
          type: 'AssignmentElement',
          DestructuringAssignmentTarget: node,
          Initializer: undefined
        };

      case 'CoverInitializedName':
        return {
          type: 'AssignmentProperty',
          IdentifierReference: node.IdentifierReference,
          Initializer: node.Initializer
        };

      case 'AssignmentExpression':
        return {
          type: 'AssignmentElement',
          DestructuringAssignmentTarget: node.LeftHandSideExpression,
          Initializer: node.AssignmentExpression
        };

      case 'Elision':
        return {
          type: 'Elision'
        };

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('refineLeftHandSideExpression', node.type);
    }
  } // #sec-assignment-operators-runtime-semantics-evaluation
  //   AssignmentExpression :
  //     LeftHandSideExpression `=` AssignmentExpression
  //     LeftHandSideExpression AssignmentOperator AssignmentExpression
  //     LeftHandSideExpression `&&=` AssignmentExpression
  //     LeftHandSideExpression `||=` AssignmentExpression
  //     LeftHandSideExpression `??=` AssignmentExpression

  function* Evaluate_AssignmentExpression({
    LeftHandSideExpression,
    AssignmentOperator,
    AssignmentExpression
  }) {
    if (AssignmentOperator === '=') {
      // 1. If LeftHandSideExpression is neither an ObjectLiteral nor an ArrayLiteral, then
      if (LeftHandSideExpression.type !== 'ObjectLiteral' && LeftHandSideExpression.type !== 'ArrayLiteral') {
        // a. Let lref be the result of evaluating LeftHandSideExpression.
        let lref = yield* Evaluate(LeftHandSideExpression); // b. ReturnIfAbrupt(lref).

        /* istanbul ignore if */
        if (lref instanceof AbruptCompletion) {
          return lref;
        }
        /* istanbul ignore if */


        if (lref instanceof Completion) {
          lref = lref.Value;
        }

        let rval;

        if (IsAnonymousFunctionDefinition(AssignmentExpression) && IsIdentifierRef(LeftHandSideExpression)) {
          // i. Let rval be NamedEvaluation of AssignmentExpression with argument GetReferencedName(lref).
          rval = yield* NamedEvaluation(AssignmentExpression, GetReferencedName(lref));
        } else {
          // d. Else,
          // i. Let rref be the result of evaluating AssignmentExpression.
          const rref = yield* Evaluate(AssignmentExpression); // ii. Let rval be ? GetValue(rref).

          let _temp = GetValue(rref);
          /* istanbul ignore if */


          if (_temp instanceof AbruptCompletion) {
            return _temp;
          }
          /* istanbul ignore if */


          if (_temp instanceof Completion) {
            _temp = _temp.Value;
          }

          rval = _temp;
        } // e. Perform ? PutValue(lref, rval).


        let _temp2 = PutValue(lref, rval);

        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }

        return rval;
      } // 2. Let assignmentPattern be the AssignmentPattern that is covered by LeftHandSideExpression.


      const assignmentPattern = refineLeftHandSideExpression(LeftHandSideExpression); // 3. Let rref be the result of evaluating AssignmentExpression.

      const rref = yield* Evaluate(AssignmentExpression); // 3. Let rval be ? GetValue(rref).

      let _temp3 = GetValue(rref);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      const rval = _temp3; // 4. Perform ? DestructuringAssignmentEvaluation of assignmentPattern using rval as the argument.

      let _temp4 = yield* DestructuringAssignmentEvaluation(assignmentPattern, rval);

      if (_temp4 instanceof AbruptCompletion) {
        return _temp4;
      }

      if (_temp4 instanceof Completion) {
        _temp4 = _temp4.Value;
      }

      return rval;
    } else if (AssignmentOperator === '&&=') {
      // 1. Let lref be the result of evaluating LeftHandSideExpression.
      const lref = yield* Evaluate(LeftHandSideExpression); // 2. Let lval be ? GetValue(lref).

      let _temp5 = GetValue(lref);

      if (_temp5 instanceof AbruptCompletion) {
        return _temp5;
      }

      if (_temp5 instanceof Completion) {
        _temp5 = _temp5.Value;
      }

      const lval = _temp5; // 3. Let lbool be ! ToBoolean(lval).

      let _temp6 = ToBoolean(lval);

      Assert(!(_temp6 instanceof AbruptCompletion), "ToBoolean(lval)" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp6 instanceof Completion) {
        _temp6 = _temp6.Value;
      }

      const lbool = _temp6; // 4. If lbool is false, return lval.

      if (lbool === Value.false) {
        return lval;
      }

      let rval; // 5. If IsAnonymousFunctionDefinition(AssignmentExpression) is true and IsIdentifierRef of LeftHandSideExpression is true, then

      if (IsAnonymousFunctionDefinition(AssignmentExpression) && IsIdentifierRef(LeftHandSideExpression)) {
        // a. Let rval be NamedEvaluation of AssignmentExpression with argument GetReferencedName(lref).
        rval = yield* NamedEvaluation(AssignmentExpression, GetReferencedName(lref));
      } else {
        // 6. Else,
        // a. Let rref be the result of evaluating AssignmentExpression.
        const rref = yield* Evaluate(AssignmentExpression); // b. Let rval be ? GetValue(rref).

        let _temp7 = GetValue(rref);

        if (_temp7 instanceof AbruptCompletion) {
          return _temp7;
        }

        if (_temp7 instanceof Completion) {
          _temp7 = _temp7.Value;
        }

        rval = _temp7;
      } // 7. Perform ? PutValue(lref, rval).


      let _temp8 = PutValue(lref, rval);

      if (_temp8 instanceof AbruptCompletion) {
        return _temp8;
      }

      if (_temp8 instanceof Completion) {
        _temp8 = _temp8.Value;
      }

      return rval;
    } else if (AssignmentOperator === '||=') {
      // 1. Let lref be the result of evaluating LeftHandSideExpression.
      const lref = yield* Evaluate(LeftHandSideExpression); // 2. Let lval be ? GetValue(lref).

      let _temp9 = GetValue(lref);

      if (_temp9 instanceof AbruptCompletion) {
        return _temp9;
      }

      if (_temp9 instanceof Completion) {
        _temp9 = _temp9.Value;
      }

      const lval = _temp9; // 3. Let lbool be ! ToBoolean(lval).

      let _temp10 = ToBoolean(lval);

      Assert(!(_temp10 instanceof AbruptCompletion), "ToBoolean(lval)" + ' returned an abrupt completion');

      if (_temp10 instanceof Completion) {
        _temp10 = _temp10.Value;
      }

      const lbool = _temp10; // 4. If lbool is true, return lval.

      if (lbool === Value.true) {
        return lval;
      }

      let rval; // 5. If IsAnonymousFunctionDefinition(AssignmentExpression) is true and IsIdentifierRef of LeftHandSideExpression is true, then

      if (IsAnonymousFunctionDefinition(AssignmentExpression) && IsIdentifierRef(LeftHandSideExpression)) {
        // a. Let rval be NamedEvaluation of AssignmentExpression with argument GetReferencedName(lref).
        rval = yield* NamedEvaluation(AssignmentExpression, GetReferencedName(lref));
      } else {
        // 6. Else,
        // a. Let rref be the result of evaluating AssignmentExpression.
        const rref = yield* Evaluate(AssignmentExpression); // b. Let rval be ? GetValue(rref).

        let _temp11 = GetValue(rref);

        if (_temp11 instanceof AbruptCompletion) {
          return _temp11;
        }

        if (_temp11 instanceof Completion) {
          _temp11 = _temp11.Value;
        }

        rval = _temp11;
      } // 7. Perform ? PutValue(lref, rval).


      let _temp12 = PutValue(lref, rval);

      if (_temp12 instanceof AbruptCompletion) {
        return _temp12;
      }

      if (_temp12 instanceof Completion) {
        _temp12 = _temp12.Value;
      }

      return rval;
    } else if (AssignmentOperator === '??=') {
      // 1.Let lref be the result of evaluating LeftHandSideExpression.
      const lref = yield* Evaluate(LeftHandSideExpression); // 2. Let lval be ? GetValue(lref).

      let _temp13 = GetValue(lref);

      if (_temp13 instanceof AbruptCompletion) {
        return _temp13;
      }

      if (_temp13 instanceof Completion) {
        _temp13 = _temp13.Value;
      }

      const lval = _temp13; // 3. If lval is not undefined nor null, return lval.

      if (lval !== Value.undefined && lval !== Value.null) {
        return lval;
      }

      let rval; // 4. If IsAnonymousFunctionDefinition(AssignmentExpression) is true and IsIdentifierRef of LeftHandSideExpression is true, then

      if (IsAnonymousFunctionDefinition(AssignmentExpression) && IsIdentifierRef(LeftHandSideExpression)) {
        // a. Let rval be NamedEvaluation of AssignmentExpression with argument GetReferencedName(lref).
        rval = yield* NamedEvaluation(AssignmentExpression, GetReferencedName(lref));
      } else {
        // 5. Else,
        // a. Let rref be the result of evaluating AssignmentExpression.
        const rref = yield* Evaluate(AssignmentExpression); // b. Let rval be ? GetValue(rref).

        let _temp14 = GetValue(rref);

        if (_temp14 instanceof AbruptCompletion) {
          return _temp14;
        }

        if (_temp14 instanceof Completion) {
          _temp14 = _temp14.Value;
        }

        rval = _temp14;
      } // 6. Perform ? PutValue(lref, rval).


      let _temp15 = PutValue(lref, rval);

      if (_temp15 instanceof AbruptCompletion) {
        return _temp15;
      }

      if (_temp15 instanceof Completion) {
        _temp15 = _temp15.Value;
      }

      return rval;
    } else {
      // 1. Let lref be the result of evaluating LeftHandSideExpression.
      const lref = yield* Evaluate(LeftHandSideExpression); // 2. Let lval be ? GetValue(lref).

      let _temp16 = GetValue(lref);

      if (_temp16 instanceof AbruptCompletion) {
        return _temp16;
      }

      if (_temp16 instanceof Completion) {
        _temp16 = _temp16.Value;
      }

      const lval = _temp16; // 3. Let rref be the result of evaluating AssignmentExpression.

      const rref = yield* Evaluate(AssignmentExpression); // 4. Let rval be ? GetValue(rref).

      let _temp17 = GetValue(rref);

      if (_temp17 instanceof AbruptCompletion) {
        return _temp17;
      }

      if (_temp17 instanceof Completion) {
        _temp17 = _temp17.Value;
      }

      const rval = _temp17; // 5. Let assignmentOpText be the source text matched by AssignmentOperator.

      const assignmentOpText = AssignmentOperator; // 6. Let opText be the sequence of Unicode code points associated with assignmentOpText in the following table:

      const opText = {
        '**=': '**',
        '*=': '*',
        '/=': '/',
        '%=': '%',
        '+=': '+',
        '-=': '-',
        '<<=': '<<',
        '>>=': '>>',
        '>>>=': '>>>',
        '&=': '&',
        '^=': '^',
        '|=': '|'
      }[assignmentOpText]; // 7. Let r be ApplyStringOrNumericBinaryOperator(lval, opText, rval).

      const r = ApplyStringOrNumericBinaryOperator(lval, opText, rval); // 8. Perform ? PutValue(lref, r).

      let _temp18 = PutValue(lref, r);

      if (_temp18 instanceof AbruptCompletion) {
        return _temp18;
      }

      if (_temp18 instanceof Completion) {
        _temp18 = _temp18.Value;
      }

      return r;
    }
  }

  //   BitwiseANDExpression : BitwiseANDExpression `&` EqualityExpression
  //   BitwiseXORExpression : BitwiseXORExpression `^` BitwiseANDExpression
  //   BitwiseORExpression : BitwiseORExpression `|` BitwiseXORExpression
  // The production A : A @ B, where @ is one of the bitwise operators in the
  // productions above, is evaluated as follows:

  function* Evaluate_BinaryBitwiseExpression({
    A,
    operator,
    B
  }) {
    return yield* EvaluateStringOrNumericBinaryExpression(A, operator, B);
  }

  //   CoalesceExpression :
  //     CoalesceExpressionHead `??` BitwiseORExpression

  function* Evaluate_CoalesceExpression({
    CoalesceExpressionHead,
    BitwiseORExpression
  }) {
    // 1. Let lref be the result of evaluating |CoalesceExpressionHead|.
    const lref = yield* Evaluate(CoalesceExpressionHead); // 2. Let lval be ? GetValue(lref).

    let _temp = GetValue(lref);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const lval = _temp; // 3. If lval is *undefined* or *null*,

    if (lval === Value.undefined || lval === Value.null) {
      // a. Let rref be the result of evaluating |BitwiseORExpression|.
      const rref = yield* Evaluate(BitwiseORExpression); // b. Return ? GetValue(rref).

      return GetValue(rref);
    } // 4. Otherwise, return lval.


    return lval;
  }

  //   EmptyStatement : `;`

  function Evaluate_EmptyStatement(_EmptyStatement) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  // ExponentiationExpression : UpdateExpression ** ExponentiationExpression

  function* Evaluate_ExponentiationExpression({
    UpdateExpression,
    ExponentiationExpression
  }) {
    // 1. Return ? EvaluateStringOrNumericBinaryExpression(UpdateExpression, **, ExponentiationExpression).
    return yield* EvaluateStringOrNumericBinaryExpression(UpdateExpression, '**', ExponentiationExpression);
  }

  // IfStatement :
  //   `if` `(` Expression `)` Statement `else` Statement
  //   `if` `(` Expression `)` Statement

  function* Evaluate_IfStatement({
    Expression,
    Statement_a,
    Statement_b
  }) {
    // 1. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression); // 2. Let exprValue be ! ToBoolean(? GetValue(exprRef)).

    let _temp = GetValue(exprRef);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const exprValue = ToBoolean(_temp);

    if (Statement_b) {
      let stmtCompletion; // 3. If exprValue is true, then

      if (exprValue === Value.true) {
        // a. Let stmtCompletion be the result of evaluating the first Statement.
        stmtCompletion = yield* Evaluate(Statement_a);
      } else {
        // 4. Else,
        // a. Let stmtCompletion be the result of evaluating the second Statement.
        stmtCompletion = yield* Evaluate(Statement_b);
      } // 5. Return Completion(UpdateEmpty(stmtCompletion, undefined)).


      return Completion(UpdateEmpty(EnsureCompletion(stmtCompletion), Value.undefined));
    } else {
      // 3. If exprValue is false, then
      if (exprValue === Value.false) {
        // a. Return NormalCompletion(undefined).
        return NormalCompletion(Value.undefined);
      } else {
        // 4. Else,
        // a. Let stmtCompletion be the result of evaluating Statement.
        const stmtCompletion = yield* Evaluate(Statement_a); // b. Return Completion(UpdateEmpty(stmtCompletion, undefined)).

        return Completion(UpdateEmpty(EnsureCompletion(stmtCompletion), Value.undefined));
      }
    }
  }

  // ImportCall : `import` `(` AssignmentExpression `)`

  function* Evaluate_ImportCall({
    AssignmentExpression
  }) {
    let _temp = GetActiveScriptOrModule();

    Assert(!(_temp instanceof AbruptCompletion), "GetActiveScriptOrModule()" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    // 1. Let referencingScriptOrModule be ! GetActiveScriptOrModule().
    const referencingScriptOrModule = _temp; // 2. Let argRef be the result of evaluating AssignmentExpression.

    const argRef = yield* Evaluate(AssignmentExpression); // 3. Let specifier be ? GetValue(argRef).

    let _temp2 = GetValue(argRef);
    /* istanbul ignore if */


    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }
    /* istanbul ignore if */


    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const specifier = _temp2; // 4. Let promiseCapability be ! NewPromiseCapability(%Promise%).

    let _temp3 = NewPromiseCapability(exports.surroundingAgent.intrinsic('%Promise%'));

    Assert(!(_temp3 instanceof AbruptCompletion), "NewPromiseCapability(surroundingAgent.intrinsic('%Promise%'))" + ' returned an abrupt completion');

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const promiseCapability = _temp3; // 5. Let specifierString be ToString(specifier).

    let specifierString = ToString(specifier); // 6. IfAbruptRejectPromise(specifierString, promiseCapability).

    /* istanbul ignore if */
    if (specifierString instanceof AbruptCompletion) {
      const hygenicTemp2 = Call(promiseCapability.Reject, Value.undefined, [specifierString.Value]);

      if (hygenicTemp2 instanceof AbruptCompletion) {
        return hygenicTemp2;
      }

      return promiseCapability.Promise;
    }
    /* istanbul ignore if */


    if (specifierString instanceof Completion) {
      specifierString = specifierString.Value;
    }

    let _temp4 = HostImportModuleDynamically(referencingScriptOrModule, specifierString, promiseCapability);

    Assert(!(_temp4 instanceof AbruptCompletion), "HostImportModuleDynamically(referencingScriptOrModule, specifierString, promiseCapability)" + ' returned an abrupt completion');

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    return promiseCapability.Promise;
  }

  //   MultiplicativeExpression :
  //     MultiplicativeExpression MultiplicativeOperator ExponentiationExpression

  function* Evaluate_MultiplicativeExpression({
    MultiplicativeExpression,
    MultiplicativeOperator,
    ExponentiationExpression
  }) {
    // 1. Let opText be the source text matched by MultiplicativeOperator.
    const opText = MultiplicativeOperator; // 2. Return ? EvaluateStringOrNumericBinaryExpression(MultiplicativeExpression, opText, ExponentiationExpression).

    return yield* EvaluateStringOrNumericBinaryExpression(MultiplicativeExpression, opText, ExponentiationExpression);
  }

  // ThrowStatement : `throw` Expression `;`

  function* Evaluate_ThrowStatement({
    Expression
  }) {
    // 1. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression); // 2. Let exprValue be ? GetValue(exprRef).

    let _temp = GetValue(exprRef);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const exprValue = _temp; // 3. Return ThrowCompletion(exprValue).

    return ThrowCompletion(exprValue);
  }

  //   LeftHandSideExpression `++`
  //   LeftHandSideExpression `--`
  //   `++` UnaryExpression
  //   `--` UnaryExpression

  function* Evaluate_UpdateExpression({
    LeftHandSideExpression,
    operator,
    UnaryExpression
  }) {
    switch (true) {
      // UpdateExpression : LeftHandSideExpression `++`
      case operator === '++' && !!LeftHandSideExpression:
        {
          // 1. Let lhs be the result of evaluating LeftHandSideExpression.
          const lhs = yield* Evaluate(LeftHandSideExpression); // 2. Let oldValue be ? ToNumeric(? GetValue(lhs)).

          let _temp4 = GetValue(lhs);
          /* istanbul ignore if */


          if (_temp4 instanceof AbruptCompletion) {
            return _temp4;
          }
          /* istanbul ignore if */


          if (_temp4 instanceof Completion) {
            _temp4 = _temp4.Value;
          }

          let _temp = ToNumeric(_temp4);

          if (_temp instanceof AbruptCompletion) {
            return _temp;
          }

          if (_temp instanceof Completion) {
            _temp = _temp.Value;
          }

          const oldValue = _temp; // 3. Let newValue be ! Type(oldvalue)::add(oldValue, Type(oldValue)::unit).

          let _temp2 = TypeForMethod(oldValue).add(oldValue, TypeForMethod(oldValue).unit);

          Assert(!(_temp2 instanceof AbruptCompletion), "TypeForMethod(oldValue).add(oldValue, TypeForMethod(oldValue).unit)" + ' returned an abrupt completion');
          /* istanbul ignore if */

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }

          const newValue = _temp2; // 4. Perform ? PutValue(lhs, newValue).

          let _temp3 = PutValue(lhs, newValue);

          if (_temp3 instanceof AbruptCompletion) {
            return _temp3;
          }

          if (_temp3 instanceof Completion) {
            _temp3 = _temp3.Value;
          }

          return oldValue;
        }
      // UpdateExpression : LeftHandSideExpression `--`

      case operator === '--' && !!LeftHandSideExpression:
        {
          // 1. Let lhs be the result of evaluating LeftHandSideExpression.
          const lhs = yield* Evaluate(LeftHandSideExpression); // 2. Let oldValue be ? ToNumeric(? GetValue(lhs)).

          let _temp8 = GetValue(lhs);

          if (_temp8 instanceof AbruptCompletion) {
            return _temp8;
          }

          if (_temp8 instanceof Completion) {
            _temp8 = _temp8.Value;
          }

          let _temp5 = ToNumeric(_temp8);

          if (_temp5 instanceof AbruptCompletion) {
            return _temp5;
          }

          if (_temp5 instanceof Completion) {
            _temp5 = _temp5.Value;
          }

          const oldValue = _temp5; // 3. Let newValue be ! Type(oldvalue)::subtract(oldValue, Type(oldValue)::unit).

          let _temp6 = TypeForMethod(oldValue).subtract(oldValue, TypeForMethod(oldValue).unit);

          Assert(!(_temp6 instanceof AbruptCompletion), "TypeForMethod(oldValue).subtract(oldValue, TypeForMethod(oldValue).unit)" + ' returned an abrupt completion');

          if (_temp6 instanceof Completion) {
            _temp6 = _temp6.Value;
          }

          const newValue = _temp6; // 4. Perform ? PutValue(lhs, newValue).

          let _temp7 = PutValue(lhs, newValue);

          if (_temp7 instanceof AbruptCompletion) {
            return _temp7;
          }

          if (_temp7 instanceof Completion) {
            _temp7 = _temp7.Value;
          }

          return oldValue;
        }
      // UpdateExpression : `++` UnaryExpression

      case operator === '++' && !!UnaryExpression:
        {
          // 1. Let expr be the result of evaluating UnaryExpression.
          const expr = yield* Evaluate(UnaryExpression); // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).

          let _temp12 = GetValue(expr);

          if (_temp12 instanceof AbruptCompletion) {
            return _temp12;
          }

          if (_temp12 instanceof Completion) {
            _temp12 = _temp12.Value;
          }

          let _temp9 = ToNumeric(_temp12);

          if (_temp9 instanceof AbruptCompletion) {
            return _temp9;
          }

          if (_temp9 instanceof Completion) {
            _temp9 = _temp9.Value;
          }

          const oldValue = _temp9; // 3. Let newValue be ! Type(oldvalue)::add(oldValue, Type(oldValue)::unit).

          let _temp10 = TypeForMethod(oldValue).add(oldValue, TypeForMethod(oldValue).unit);

          Assert(!(_temp10 instanceof AbruptCompletion), "TypeForMethod(oldValue).add(oldValue, TypeForMethod(oldValue).unit)" + ' returned an abrupt completion');

          if (_temp10 instanceof Completion) {
            _temp10 = _temp10.Value;
          }

          const newValue = _temp10; // 4. Perform ? PutValue(expr, newValue).

          let _temp11 = PutValue(expr, newValue);

          if (_temp11 instanceof AbruptCompletion) {
            return _temp11;
          }

          if (_temp11 instanceof Completion) {
            _temp11 = _temp11.Value;
          }

          return newValue;
        }
      // UpdateExpression : `--` UnaryExpression

      case operator === '--' && !!UnaryExpression:
        {
          // 1. Let expr be the result of evaluating UnaryExpression.
          const expr = yield* Evaluate(UnaryExpression); // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).

          let _temp16 = GetValue(expr);

          if (_temp16 instanceof AbruptCompletion) {
            return _temp16;
          }

          if (_temp16 instanceof Completion) {
            _temp16 = _temp16.Value;
          }

          let _temp13 = ToNumeric(_temp16);

          if (_temp13 instanceof AbruptCompletion) {
            return _temp13;
          }

          if (_temp13 instanceof Completion) {
            _temp13 = _temp13.Value;
          }

          const oldValue = _temp13; // 3. Let newValue be ! Type(oldvalue)::subtract(oldValue, Type(oldValue)::unit).

          let _temp14 = TypeForMethod(oldValue).subtract(oldValue, TypeForMethod(oldValue).unit);

          Assert(!(_temp14 instanceof AbruptCompletion), "TypeForMethod(oldValue).subtract(oldValue, TypeForMethod(oldValue).unit)" + ' returned an abrupt completion');

          if (_temp14 instanceof Completion) {
            _temp14 = _temp14.Value;
          }

          const newValue = _temp14; // 4. Perform ? PutValue(expr, newValue).

          let _temp15 = PutValue(expr, newValue);

          if (_temp15 instanceof AbruptCompletion) {
            return _temp15;
          }

          if (_temp15 instanceof Completion) {
            _temp15 = _temp15.Value;
          }

          return newValue;
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_UpdateExpression', operator);
    }
  }

  function GlobalDeclarationInstantiation(script, env) {
    // 1. Assert: env is a global Environment Record.
    Assert(env instanceof EnvironmentRecord, "env instanceof EnvironmentRecord"); // 2. Let lexNames be the LexicallyDeclaredNames of script.

    const lexNames = LexicallyDeclaredNames(script); // 3. Let varNames be the VarDeclaredNames of script.

    const varNames = VarDeclaredNames(script); // 4. For each name in lexNames, do

    for (const name of lexNames) {
      // 1. If env.HasVarDeclaration(name) is true, throw a SyntaxError exception.
      if (env.HasVarDeclaration(name) === Value.true) {
        return exports.surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
      } // 1. If env.HasLexicalDeclaration(name) is true, throw a SyntaxError exception.


      if (env.HasLexicalDeclaration(name) === Value.true) {
        return exports.surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
      } // 1. Let hasRestrictedGlobal be ? env.HasRestrictedGlobalProperty(name).


      let _temp = env.HasRestrictedGlobalProperty(name);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      const hasRestrictedGlobal = _temp; // 1. If hasRestrictedGlobal is true, throw a SyntaxError exception.

      if (hasRestrictedGlobal === Value.true) {
        return exports.surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
      }
    } // 5. For each name in varNames, do


    for (const name of varNames) {
      // 1. If env.HasLexicalDeclaration(name) is true, throw a SyntaxError exception.
      if (env.HasLexicalDeclaration(name) === Value.true) {
        return exports.surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
      }
    } // 6. Let varDeclarations be the VarScopedDeclarations of script.


    const varDeclarations = VarScopedDeclarations(script); // 7. Let functionsToInitialize be a new empty List.

    const functionsToInitialize = []; // 8. Let declaredFunctionNames be a new empty List.

    const declaredFunctionNames = new ValueSet(); // 9. For each d in varDeclarations, in reverse list order, do

    for (const d of [...varDeclarations].reverse()) {
      // a. If d is neither a VariableDeclaration nor a ForBinding nor a BindingIdentifier, then
      if (d.type !== 'VariableDeclaration' && d.type !== 'ForBinding' && d.type !== 'BindingIdentifier') {
        // i. Assert: d is either a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration.
        Assert(d.type === 'FunctionDeclaration' || d.type === 'GeneratorDeclaration' || d.type === 'AsyncFunctionDeclaration' || d.type === 'AsyncGeneratorDeclaration', "d.type === 'FunctionDeclaration'\n             || d.type === 'GeneratorDeclaration'\n             || d.type === 'AsyncFunctionDeclaration'\n             || d.type === 'AsyncGeneratorDeclaration'"); // ii. NOTE: If there are multiple function declarations for the same name, the last declaration is used.
        // iii. Let fn be the sole element of the BoundNames of d.

        const fn = BoundNames(d)[0]; // iv. If fn is not an element of declaredFunctionNames, then

        if (!declaredFunctionNames.has(fn)) {
          let _temp2 = env.CanDeclareGlobalFunction(fn);

          if (_temp2 instanceof AbruptCompletion) {
            return _temp2;
          }

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }

          // 1. Let fnDefinable be ? env.CanDeclareGlobalFunction(fn).
          const fnDefinable = _temp2; // 2. If fnDefinable is false, throw a TypeError exception.

          if (fnDefinable === Value.false) {
            return exports.surroundingAgent.Throw('TypeError', 'AlreadyDeclared', fn);
          } // 3. Append fn to declaredFunctionNames.


          declaredFunctionNames.add(fn); // 4. Insert d as the first element of functionsToInitialize.

          functionsToInitialize.unshift(d);
        }
      }
    } // 10. Let declaredVarNames be a new empty List.


    const declaredVarNames = new ValueSet(); // 11. For each d in varDeclarations, do

    for (const d of varDeclarations) {
      // a. If d is a VariableDeclaration, a ForBinding, or a BindingIdentifier, then
      if (d.type === 'VariableDeclaration' || d.type === 'ForBinding' || d.type === 'BindingIdentifier') {
        // i. For each String vn in the BoundNames of d, do
        for (const vn of BoundNames(d)) {
          // 1. If vn is not an element of declaredFunctionNames, then
          if (!declaredFunctionNames.has(vn)) {
            let _temp3 = env.CanDeclareGlobalVar(vn);

            if (_temp3 instanceof AbruptCompletion) {
              return _temp3;
            }

            if (_temp3 instanceof Completion) {
              _temp3 = _temp3.Value;
            }

            // a. Let vnDefinable be ? env.CanDeclareGlobalVar(vn).
            const vnDefinable = _temp3; // b. If vnDefinable is false, throw a TypeError exception.

            if (vnDefinable === Value.false) {
              return exports.surroundingAgent.Throw('TypeError', 'AlreadyDeclared', vn);
            } // c. If vn is not an element of declaredVarNames, then


            if (!declaredVarNames.has(vn)) {
              // i. Append vn to declaredVarNames.
              declaredVarNames.add(vn);
            }
          }
        }
      }
    } // 12. NOTE: No abnormal terminations occur after this algorithm step if the global object is an ordinary object. However, if the global object is a Proxy exotic object it may exhibit behaviours that cause abnormal terminations in some of the following steps.
    // 13. NOTE: Annex B.3.3.2 adds additional steps at this point.
    // 14. Let lexDeclarations be the LexicallyScopedDeclarations of script.


    const lexDeclarations = LexicallyScopedDeclarations(script); // 15. For each element d in lexDeclarations, do

    for (const d of lexDeclarations) {
      // a. NOTE: Lexically declared names are only instantiated here but not initialized.
      // b. For each element dn of the BoundNames of d, do
      for (const dn of BoundNames(d)) {
        // 1. If IsConstantDeclaration of d is true, then
        if (IsConstantDeclaration(d)) {
          let _temp4 = env.CreateImmutableBinding(dn, Value.true);

          if (_temp4 instanceof AbruptCompletion) {
            return _temp4;
          }

          if (_temp4 instanceof Completion) {
            _temp4 = _temp4.Value;
          }
        } else {
          let _temp5 = env.CreateMutableBinding(dn, Value.false);

          if (_temp5 instanceof AbruptCompletion) {
            return _temp5;
          }

          if (_temp5 instanceof Completion) {
            _temp5 = _temp5.Value;
          }
        }
      }
    } // 16. For each Parse Node f in functionsToInitialize, do


    for (const f of functionsToInitialize) {
      // a. Let fn be the sole element of the BoundNames of f.
      const fn = BoundNames(f)[0]; // b. Let fo be InstantiateFunctionObject of f with argument env.

      const fo = InstantiateFunctionObject(f, env); // c. Perform ? env.CreateGlobalFunctionBinding(fn, fo, false).

      let _temp6 = env.CreateGlobalFunctionBinding(fn, fo, Value.false);

      if (_temp6 instanceof AbruptCompletion) {
        return _temp6;
      }

      if (_temp6 instanceof Completion) {
        _temp6 = _temp6.Value;
      }
    } // 17. For each String vn in declaredVarNames, in list order, do


    for (const vn of declaredVarNames) {
      let _temp7 = env.CreateGlobalVarBinding(vn, Value.false);

      if (_temp7 instanceof AbruptCompletion) {
        return _temp7;
      }

      if (_temp7 instanceof Completion) {
        _temp7 = _temp7.Value;
      }
    } // 18. Return NormalCompletion(empty).


    return NormalCompletion(undefined);
  }

  //   FunctionDeclaration :
  //     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
  //     `function` `(` FormalParameters `)` `{` FunctionBody `}`

  function InstantiateFunctionObject_FunctionDeclaration(FunctionDeclaration, scope) {
    const {
      BindingIdentifier,
      FormalParameters,
      FunctionBody
    } = FunctionDeclaration; // 1. Let name be StringValue of BindingIdentifier.

    const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default'); // 2. Let sourceText be the source text matched by FunctionDeclaration.

    const sourceText = sourceTextMatchedBy(FunctionDeclaration); // 3. Let F be OrdinaryFunctionCreate(%Function.prototype%, sourceText, FormalParameters, FunctionBody, non-lexical-this, scope).

    let _temp = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', scope);

    Assert(!(_temp instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const F = _temp; // 4. Perform SetFunctionName(F, name).

    SetFunctionName(F, name); // 5. Perform MakeConstructor(F).

    MakeConstructor(F); // 6. Return F.

    return F;
  } // 14.4.11 #sec-generator-function-definitions-runtime-semantics-instantiatefunctionobject
  //   GeneratorDeclaration :
  //     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
  //     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`

  function InstantiateFunctionObject_GeneratorDeclaration(GeneratorDeclaration, scope) {
    const {
      BindingIdentifier,
      FormalParameters,
      GeneratorBody
    } = GeneratorDeclaration; // 1. Let name be StringValue of BindingIdentifier.

    const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default'); // 2. Let sourceText be the source text matched by GeneratorDeclaration.

    const sourceText = sourceTextMatchedBy(GeneratorDeclaration); // 3. Let F be OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, scope).

    let _temp2 = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', scope);

    Assert(!(_temp2 instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const F = _temp2; // 4. Perform SetFunctionName(F, name).

    SetFunctionName(F, name); // 5. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).

    let _temp3 = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%'));

    Assert(!(_temp3 instanceof AbruptCompletion), "OrdinaryObjectCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%'))" + ' returned an abrupt completion');

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const prototype = _temp3; // 6. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    let _temp4 = DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    }));

    Assert(!(_temp4 instanceof AbruptCompletion), "DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({\n    Value: prototype,\n    Writable: Value.true,\n    Enumerable: Value.false,\n    Configurable: Value.false,\n  }))" + ' returned an abrupt completion');

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    return F;
  } // #sec-async-function-definitions-InstantiateFunctionObject
  //  AsyncFunctionDeclaration :
  //    `async` `function` BindingIdentifier `(` FormalParameters `)` `{` AsyncFunctionBody `}`
  //    `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`

  function InstantiateFunctionObject_AsyncFunctionDeclaration(AsyncFunctionDeclaration, scope) {
    const {
      BindingIdentifier,
      FormalParameters,
      AsyncFunctionBody
    } = AsyncFunctionDeclaration; // 1. Let name be StringValue of BindingIdentifier.

    const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default'); // 2. Let sourceText be the source text matched by AsyncFunctionDeclaration.

    const sourceText = sourceTextMatchedBy(AsyncFunctionDeclaration); // 3. Let F be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, scope).

    let _temp5 = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope);

    Assert(!(_temp5 instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    const F = _temp5; // 4. Perform ! SetFunctionName(F, name).

    SetFunctionName(F, name); // 5. Return F.

    return F;
  } // #sec-asyncgenerator-definitions-evaluatebody
  //  AsyncGeneratorDeclaration :
  //    `async` `function` `*` BindingIdentifier `(` FormalParameters`)` `{` AsyncGeneratorBody `}`
  //    `async` `function` `*` `(` FormalParameters`)` `{` AsyncGeneratorBody `}`

  function InstantiateFunctionObject_AsyncGeneratorDeclaration(AsyncGeneratorDeclaration, scope) {
    const {
      BindingIdentifier,
      FormalParameters,
      AsyncGeneratorBody
    } = AsyncGeneratorDeclaration; // 1. Let name be StringValue of BindingIdentifier.

    const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default'); // 2. Let sourceText be the source text matched by AsyncGeneratorDeclaration.

    const sourceText = sourceTextMatchedBy(AsyncGeneratorDeclaration); // 3. Let F be ! OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, FormalParameters, AsyncGeneratorBody, non-lexical-this, scope).

    let _temp6 = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope);

    Assert(!(_temp6 instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');

    if (_temp6 instanceof Completion) {
      _temp6 = _temp6.Value;
    }

    const F = _temp6; // 4. Perform ! SetFunctionName(F, name).

    SetFunctionName(F, name); // 5. Let prototype be ! OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).

    let _temp7 = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'));

    Assert(!(_temp7 instanceof AbruptCompletion), "OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'))" + ' returned an abrupt completion');

    if (_temp7 instanceof Completion) {
      _temp7 = _temp7.Value;
    }

    const prototype = _temp7; // 6. Perform ! DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    let _temp8 = DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    }));

    Assert(!(_temp8 instanceof AbruptCompletion), "DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({\n    Value: prototype,\n    Writable: Value.true,\n    Enumerable: Value.false,\n    Configurable: Value.false,\n  }))" + ' returned an abrupt completion');

    if (_temp8 instanceof Completion) {
      _temp8 = _temp8.Value;
    }

    return F;
  }
  function InstantiateFunctionObject(AnyFunctionDeclaration, scope) {
    switch (AnyFunctionDeclaration.type) {
      case 'FunctionDeclaration':
        return InstantiateFunctionObject_FunctionDeclaration(AnyFunctionDeclaration, scope);

      case 'GeneratorDeclaration':
        return InstantiateFunctionObject_GeneratorDeclaration(AnyFunctionDeclaration, scope);

      case 'AsyncFunctionDeclaration':
        return InstantiateFunctionObject_AsyncFunctionDeclaration(AnyFunctionDeclaration, scope);

      case 'AsyncGeneratorDeclaration':
        return InstantiateFunctionObject_AsyncGeneratorDeclaration(AnyFunctionDeclaration, scope);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('InstantiateFunctionObject', AnyFunctionDeclaration);
    }
  }

  // Script :
  //   [empty]
  //   ScriptBody

  function* Evaluate_Script({
    ScriptBody
  }) {
    if (!ScriptBody) {
      return NormalCompletion(Value.undefined);
    }

    return yield* Evaluate(ScriptBody);
  }

  function Evaluate_ScriptBody(ScriptBody) {
    return Evaluate_StatementList(ScriptBody.StatementList);
  }

  function* Evaluate_StatementList(StatementList) {
    if (StatementList.length === 0) {
      return NormalCompletion(undefined);
    }

    let sl = yield* Evaluate(StatementList[0]);

    if (StatementList.length === 1) {
      return sl;
    }

    for (const StatementListItem of StatementList.slice(1)) {
      /* istanbul ignore if */
      if (sl instanceof AbruptCompletion) {
        return sl;
      }
      /* istanbul ignore if */


      if (sl instanceof Completion) {
        sl = sl.Value;
      }
      let s = yield* Evaluate(StatementListItem); // We don't always return a Completion value, but here we actually need it
      // to be a Completion.

      s = EnsureCompletion(s);
      sl = UpdateEmpty(s, sl);
    }

    return sl;
  }

  //   ExpressionStatement :
  //     Expression `;`

  function* Evaluate_ExpressionStatement({
    Expression
  }) {
    // 1. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression); // 2. Return ? GetValue(exprRef).

    return GetValue(exprRef);
  }

  //   VariableDeclaration :
  //     BindingIdentifier
  //     BindingIdentifier Initializer
  //     BindingPattern Initializer

  function* Evaluate_VariableDeclaration({
    BindingIdentifier,
    Initializer,
    BindingPattern
  }) {
    if (BindingIdentifier) {
      if (!Initializer) {
        // 1. Return NormalCompletion(empty).
        return NormalCompletion(undefined);
      } // 1. Let bindingId be StringValue of BindingIdentifier.


      const bindingId = StringValue(BindingIdentifier); // 2. Let lhs be ? ResolveBinding(bindingId).

      let _temp = ResolveBinding(bindingId, undefined, BindingIdentifier.strict);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      const lhs = _temp; // 3. If IsAnonymousFunctionDefinition(Initializer) is true, then

      let value;

      if (IsAnonymousFunctionDefinition(Initializer)) {
        // a. Let value be NamedEvaluation of Initializer with argument bindingId.
        value = yield* NamedEvaluation(Initializer, bindingId);
      } else {
        // 4. Else,
        // a. Let rhs be the result of evaluating Initializer.
        const rhs = yield* Evaluate(Initializer); // b. Let value be ? GetValue(rhs).

        let _temp2 = GetValue(rhs);

        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }

        value = _temp2;
      } // 5. Return ? PutValue(lhs, value).


      return PutValue(lhs, value);
    } // 1. Let rhs be the result of evaluating Initializer.


    const rhs = yield* Evaluate(Initializer); // 2. Let rval be ? GetValue(rhs).

    let _temp3 = GetValue(rhs);

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const rval = _temp3; // 3. Return the result of performing BindingInitialization for BindingPattern passing rval and undefined as arguments.

    return yield* BindingInitialization(BindingPattern, rval, Value.undefined);
  } // 13.3.2.4 #sec-variable-statement-runtime-semantics-evaluation
  //   VariableDeclarationList : VariableDeclarationList `,` VariableDeclaration
  //
  // (implicit)
  //   VariableDeclarationList : VariableDeclaration


  Evaluate_VariableDeclaration.section = 'https://tc39.es/ecma262/#sec-variable-statement-runtime-semantics-evaluation';
  function* Evaluate_VariableDeclarationList(VariableDeclarationList) {
    let next;

    for (const VariableDeclaration of VariableDeclarationList) {
      next = yield* Evaluate_VariableDeclaration(VariableDeclaration);

      /* istanbul ignore if */
      if (next instanceof AbruptCompletion) {
        return next;
      }
      /* istanbul ignore if */


      if (next instanceof Completion) {
        next = next.Value;
      }
    }

    return next;
  } // 13.3.2.4 #sec-variable-statement-runtime-semantics-evaluation
  //   VariableStatement : `var` VariableDeclarationList `;`

  function* Evaluate_VariableStatement({
    VariableDeclarationList
  }) {
    let next = yield* Evaluate_VariableDeclarationList(VariableDeclarationList);

    if (next instanceof AbruptCompletion) {
      return next;
    }

    if (next instanceof Completion) {
      next = next.Value;
    }
    return NormalCompletion(undefined);
  }

  // FunctionDeclaration :
  //   function BindingIdentifier ( FormalParameters ) { FunctionBody }
  //   function ( FormalParameters ) { FunctionBody }

  function Evaluate_FunctionDeclaration(_FunctionDeclaration) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  // CallExpression :
  //   CoverCallExpressionAndAsyncArrowHead
  //   CallExpression Arguments

  function* Evaluate_CallExpression(CallExpression) {
    // 1. Let expr be CoveredCallExpression of CoverCallExpressionAndAsyncArrowHead.
    const expr = CallExpression; // 2. Let memberExpr be the MemberExpression of expr.

    const memberExpr = expr.CallExpression; // 3. Let arguments be the Arguments of expr.

    const args = expr.Arguments; // 4. Let ref be the result of evaluating memberExpr.

    const ref = yield* Evaluate(memberExpr); // 5. Let func be ? GetValue(ref).

    let _temp = GetValue(ref);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const func = _temp; // 6. If Type(ref) is Reference, IsPropertyReference(ref) is false, and GetReferencedName(ref) is "eval", then

    if (Type(ref) === 'Reference' && IsPropertyReference(ref) === Value.false && Type(GetReferencedName(ref)) === 'String' && GetReferencedName(ref).stringValue() === 'eval') {
      // a. If SameValue(func, %eval%) is true, then
      if (SameValue(func, exports.surroundingAgent.intrinsic('%eval%')) === Value.true) {
        let _temp2 = yield* ArgumentListEvaluation(args);

        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }

        // i. Let argList be ? ArgumentListEvaluation of arguments.
        const argList = _temp2; // ii. If argList has no elements, return undefined.

        if (argList.length === 0) {
          return Value.undefined;
        } // iii. Let evalText be the first element of argList.


        const evalText = argList[0]; // iv. If the source code matching this CallExpression is strict mode code, let strictCaller be true. Otherwise let strictCaller be false.

        const strictCaller = CallExpression.strict; // v. Let evalRealm be the current Realm Record.

        const evalRealm = exports.surroundingAgent.currentRealmRecord; // vi. Return ? PerformEval(evalText, evalRealm, strictCaller, true).

        return PerformEval(evalText, evalRealm, strictCaller, true);
      }
    } // 7. Let thisCall be this CallExpression.

    const tailCall = IsInTailPosition(); // 9. Return ? EvaluateCall(func, ref, arguments, tailCall).

    return yield* EvaluateCall(func, ref, args, tailCall);
  }

  function* EvaluateCall(func, ref, args, tailPosition) {
    // 1. If Type(ref) is Reference, then
    let thisValue;

    if (Type(ref) === 'Reference') {
      // a. If IsPropertyReference(ref) is true, then
      if (IsPropertyReference(ref) === Value.true) {
        // i. Let thisValue be GetThisValue(ref).
        thisValue = GetThisValue(ref);
      } else {
        // i. Assert: the base of ref is an Environment Record.
        Assert(ref.BaseValue instanceof EnvironmentRecord, "ref.BaseValue instanceof EnvironmentRecord"); // ii. Let envRef be GetBase(ref).

        const refEnv = GetBase(ref); // iii. Let thisValue be envRef.WithBaseObject().

        thisValue = refEnv.WithBaseObject();
      }
    } else {
      // a. Let thisValue be undefined.
      thisValue = Value.undefined;
    } // 3. Let argList be ? ArgumentListEvaluation of arguments.


    let _temp = yield* ArgumentListEvaluation(args);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const argList = _temp; // 4. If Type(func) is not Object, throw a TypeError exception.

    if (Type(func) !== 'Object') {
      return exports.surroundingAgent.Throw('TypeError', 'NotAFunction', func);
    } // 5. If IsCallable(func) is false, throw a TypeError exception.


    if (IsCallable(func) === Value.false) {
      return exports.surroundingAgent.Throw('TypeError', 'NotAFunction', func);
    } // 6. If tailPosition is true, perform PrepareForTailCall().


    if (tailPosition) {
      PrepareForTailCall();
    } // 7. Let result be Call(func, thisValue, argList).


    const result = Call(func, thisValue, argList); // 8. Assert: If tailPosition is true, the above call will not return here but instead
    //    evaluation will continue as if the following return has already occurred.

    Assert(!tailPosition, "!tailPosition"); // 9. Assert: If result is not an abrupt completion, then Type(result) is an ECMAScript language type.

    if (!(result instanceof AbruptCompletion)) {
      Assert(result instanceof Value || result instanceof Completion, "result instanceof Value || result instanceof Completion");
    } // 10. Return result.


    return result;
  }

  function GetTemplateObject(templateLiteral) {
    // 1. Let realm be the current Realm Record.
    const realm = exports.surroundingAgent.currentRealmRecord; // 2. Let templateRegistry be realm.[[TemplateMap]].

    const templateRegistry = realm.TemplateMap; // 3. For each element e of templateRegistry, do

    for (const e of templateRegistry) {
      // a. If e.[[Site]] is the same Parse Node as templateLiteral, then
      if (e.Site === templateLiteral) {
        // b. Return e.[[Array]].
        return e.Array;
      }
    } // 4. Let rawStrings be TemplateStrings of templateLiteral with argument true.


    const rawStrings = TemplateStrings(templateLiteral, true); // 5. Let cookedStrings be TemplateStrings of templateLiteral with argument false.

    const cookedStrings = TemplateStrings(templateLiteral, false); // 6. Let count be the number of elements in the List cookedStrings.

    const count = cookedStrings.length; // 7. Assert: count ≤ 232 - 1.

    Assert(count < 2 ** 32 - 1, "count < (2 ** 32) - 1"); // 8. Let template be ! ArrayCreate(count).

    let _temp = ArrayCreate(new Value(count));

    Assert(!(_temp instanceof AbruptCompletion), "ArrayCreate(new Value(count))" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const template = _temp; // 9. Let template be ! ArrayCreate(count).

    let _temp2 = ArrayCreate(new Value(count));

    Assert(!(_temp2 instanceof AbruptCompletion), "ArrayCreate(new Value(count))" + ' returned an abrupt completion');

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const rawObj = _temp2; // 10. Let index be 0.

    let index = 0; // 11. Repeat, while index < count

    while (index < count) {
      let _temp3 = ToString(new Value(index));

      Assert(!(_temp3 instanceof AbruptCompletion), "ToString(new Value(index))" + ' returned an abrupt completion');

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      // a. Let prop be ! ToString(index).
      const prop = _temp3; // b. Let cookedValue be the String value cookedStrings[index].

      const cookedValue = cookedStrings[index]; // c. Call template.[[DefineOwnProperty]](prop, PropertyDescriptor { [[Value]]: cookedValue, [[Writable]]: false, [[Enumerable]]: true, [[Configurable]]: false }).

      let _temp4 = template.DefineOwnProperty(prop, Descriptor({
        Value: cookedValue,
        Writable: Value.false,
        Enumerable: Value.true,
        Configurable: Value.false
      }));

      Assert(!(_temp4 instanceof AbruptCompletion), "template.DefineOwnProperty(prop, Descriptor({\n      Value: cookedValue,\n      Writable: Value.false,\n      Enumerable: Value.true,\n      Configurable: Value.false,\n    }))" + ' returned an abrupt completion');

      if (_temp4 instanceof Completion) {
        _temp4 = _temp4.Value;
      }

      const rawValue = rawStrings[index]; // e. Call rawObj.[[DefineOwnProperty]](prop, PropertyDescriptor { [[Value]]: rawValue, [[Writable]]: false, [[Enumerable]]: true, [[Configurable]]: false }).

      let _temp5 = rawObj.DefineOwnProperty(prop, Descriptor({
        Value: rawValue,
        Writable: Value.false,
        Enumerable: Value.true,
        Configurable: Value.false
      }));

      Assert(!(_temp5 instanceof AbruptCompletion), "rawObj.DefineOwnProperty(prop, Descriptor({\n      Value: rawValue,\n      Writable: Value.false,\n      Enumerable: Value.true,\n      Configurable: Value.false,\n    }))" + ' returned an abrupt completion');

      if (_temp5 instanceof Completion) {
        _temp5 = _temp5.Value;
      }

      index += 1;
    } // 12. Perform SetIntegrityLevel(rawObj, frozen).


    let _temp6 = SetIntegrityLevel(rawObj, 'frozen');

    Assert(!(_temp6 instanceof AbruptCompletion), "SetIntegrityLevel(rawObj, 'frozen')" + ' returned an abrupt completion');

    if (_temp6 instanceof Completion) {
      _temp6 = _temp6.Value;
    }

    let _temp7 = template.DefineOwnProperty(new Value('raw'), Descriptor({
      Value: rawObj,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false
    }));

    Assert(!(_temp7 instanceof AbruptCompletion), "template.DefineOwnProperty(new Value('raw'), Descriptor({\n    Value: rawObj,\n    Writable: Value.false,\n    Enumerable: Value.false,\n    Configurable: Value.false,\n  }))" + ' returned an abrupt completion');

    if (_temp7 instanceof Completion) {
      _temp7 = _temp7.Value;
    }

    let _temp8 = SetIntegrityLevel(template, 'frozen');

    Assert(!(_temp8 instanceof AbruptCompletion), "SetIntegrityLevel(template, 'frozen')" + ' returned an abrupt completion');

    if (_temp8 instanceof Completion) {
      _temp8 = _temp8.Value;
    }

    templateRegistry.push({
      Site: templateLiteral,
      Array: template
    }); // 16. Return template.

    return template;
  } // 12.2.9.3 #sec-template-literals-runtime-semantics-argumentlistevaluation
  //   TemplateLiteral : NoSubstitutionTemplate
  //
  // https://github.com/tc39/ecma262/pull/1402
  //   TemplateLiteral : SubstitutionTemplate


  GetTemplateObject.section = 'https://tc39.es/ecma262/#sec-gettemplateobjec';

  function* ArgumentListEvaluation_TemplateLiteral(TemplateLiteral) {
    switch (true) {
      case TemplateLiteral.TemplateSpanList.length === 1:
        {
          const templateLiteral = TemplateLiteral;
          const siteObj = GetTemplateObject(templateLiteral);
          return [siteObj];
        }

      case TemplateLiteral.TemplateSpanList.length > 1:
        {
          const templateLiteral = TemplateLiteral;
          const siteObj = GetTemplateObject(templateLiteral);
          const restSub = [];

          for (const Expression of TemplateLiteral.ExpressionList) {
            const subRef = yield* Evaluate(Expression);

            let _temp9 = GetValue(subRef);
            /* istanbul ignore if */


            if (_temp9 instanceof AbruptCompletion) {
              return _temp9;
            }
            /* istanbul ignore if */


            if (_temp9 instanceof Completion) {
              _temp9 = _temp9.Value;
            }

            const subValue = _temp9;
            restSub.push(subValue);
          }

          return [siteObj, ...restSub];
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('ArgumentListEvaluation_TemplateLiteral', TemplateLiteral);
    }
  } // 12.3.6.1 #sec-argument-lists-runtime-semantics-argumentlistevaluation
  //   Arguments : `(` `)`
  //   ArgumentList :
  //     AssignmentExpression
  //     `...` AssignmentExpression
  //     ArgumentList `,` AssignmentExpression
  //     ArgumentList `,` `...` AssignmentExpression
  //
  // (implicit)
  //   Arguments :
  //     `(` ArgumentList `)`
  //     `(` ArgumentList `,` `)`


  ArgumentListEvaluation_TemplateLiteral.section = 'https://tc39.es/ecma262/#sec-template-literals-runtime-semantics-argumentlistevaluation';

  function* ArgumentListEvaluation_Arguments(Arguments) {
    const precedingArgs = [];

    for (const element of Arguments) {
      if (element.type === 'AssignmentRestElement') {
        const {
          AssignmentExpression
        } = element; // 2. Let spreadRef be the result of evaluating AssignmentExpression.

        const spreadRef = yield* Evaluate(AssignmentExpression); // 3. Let spreadObj be ? GetValue(spreadRef).

        let _temp10 = GetValue(spreadRef);

        if (_temp10 instanceof AbruptCompletion) {
          return _temp10;
        }

        if (_temp10 instanceof Completion) {
          _temp10 = _temp10.Value;
        }

        const spreadObj = _temp10; // 4. Let iteratorRecord be ? GetIterator(spreadObj).

        let _temp11 = GetIterator(spreadObj);

        if (_temp11 instanceof AbruptCompletion) {
          return _temp11;
        }

        if (_temp11 instanceof Completion) {
          _temp11 = _temp11.Value;
        }

        const iteratorRecord = _temp11; // 5. Repeat,

        while (true) {
          let _temp12 = IteratorStep(iteratorRecord);

          if (_temp12 instanceof AbruptCompletion) {
            return _temp12;
          }

          if (_temp12 instanceof Completion) {
            _temp12 = _temp12.Value;
          }

          // a. Let next be ? IteratorStep(iteratorRecord).
          const next = _temp12; // b. If next is false, return list.

          if (next === Value.false) {
            break;
          } // c. Let nextArg be ? IteratorValue(next).


          let _temp13 = IteratorValue(next);

          if (_temp13 instanceof AbruptCompletion) {
            return _temp13;
          }

          if (_temp13 instanceof Completion) {
            _temp13 = _temp13.Value;
          }

          const nextArg = _temp13; // d. Append nextArg as the last element of list.

          precedingArgs.push(nextArg);
        }
      } else {
        const AssignmentExpression = element; // 2. Let ref be the result of evaluating AssignmentExpression.

        const ref = yield* Evaluate(AssignmentExpression); // 3. Let arg be ? GetValue(ref).

        let _temp14 = GetValue(ref);

        if (_temp14 instanceof AbruptCompletion) {
          return _temp14;
        }

        if (_temp14 instanceof Completion) {
          _temp14 = _temp14.Value;
        }

        const arg = _temp14; // 4. Append arg to the end of precedingArgs.

        precedingArgs.push(arg); // 5. Return precedingArgs.
      }
    }

    return precedingArgs;
  }

  ArgumentListEvaluation_Arguments.section = 'https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation';
  function ArgumentListEvaluation(ArgumentsOrTemplateLiteral) {
    switch (true) {
      case Array.isArray(ArgumentsOrTemplateLiteral):
        return ArgumentListEvaluation_Arguments(ArgumentsOrTemplateLiteral);

      case ArgumentsOrTemplateLiteral.type === 'TemplateLiteral':
        return ArgumentListEvaluation_TemplateLiteral(ArgumentsOrTemplateLiteral);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('ArgumentListEvaluation', ArgumentsOrTemplateLiteral);
    }
  }

  function Evaluate_AnyFunctionBody({
    FunctionStatementList
  }) {
    return Evaluate_FunctionStatementList(FunctionStatementList);
  } // #sec-function-definitions-runtime-semantics-evaluatebody
  // FunctionBody : FunctionStatementList

  function* EvaluateBody_FunctionBody({
    FunctionStatementList
  }, functionObject, argumentsList) {
    let _temp = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    return yield* Evaluate_FunctionStatementList(FunctionStatementList);
  } // #sec-arrow-function-definitions-runtime-semantics-evaluation
  // ExpressionBody : AssignmentExpression

  function* Evaluate_ExpressionBody({
    AssignmentExpression
  }) {
    // 1. Let exprRef be the result of evaluating AssignmentExpression.
    const exprRef = yield* Evaluate(AssignmentExpression); // 2. Let exprValue be ? GetValue(exprRef).

    let _temp2 = GetValue(exprRef);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const exprValue = _temp2; // 3. Return Completion { [[Type]]: return, [[Value]]: exprValue, [[Target]]: empty }.

    return new Completion({
      Type: 'return',
      Value: exprValue,
      Target: undefined
    });
  } // #sec-arrow-function-definitions-runtime-semantics-evaluatebody
  // ConciseBody : ExpressionBody

  function* EvaluateBody_ConciseBody({
    ExpressionBody
  }, functionObject, argumentsList) {
    let _temp3 = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    return yield* Evaluate(ExpressionBody);
  } // #sec-async-arrow-function-definitions-EvaluateBody
  // AsyncConciseBody : ExpressionBody

  function* EvaluateBody_AsyncConciseBody({
    ExpressionBody
  }, functionObject, argumentsList) {
    let _temp4 = NewPromiseCapability(exports.surroundingAgent.intrinsic('%Promise%'));

    Assert(!(_temp4 instanceof AbruptCompletion), "NewPromiseCapability(surroundingAgent.intrinsic('%Promise%'))" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    // 1. Let promiseCapability be ! NewPromiseCapability(%Promise%).
    const promiseCapability = _temp4; // 2. Let declResult be FunctionDeclarationInstantiation(functionObject, argumentsList).

    const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList); // 3. If declResult is not an abrupt completion, then

    if (!(declResult instanceof AbruptCompletion)) {
      let _temp5 = AsyncFunctionStart(promiseCapability, ExpressionBody);

      Assert(!(_temp5 instanceof AbruptCompletion), "AsyncFunctionStart(promiseCapability, ExpressionBody)" + ' returned an abrupt completion');

      if (_temp5 instanceof Completion) {
        _temp5 = _temp5.Value;
      }
    } else {
      let _temp6 = Call(promiseCapability.Reject, Value.undefined, [declResult.Value]);

      Assert(!(_temp6 instanceof AbruptCompletion), "Call(promiseCapability.Reject, Value.undefined, [declResult.Value])" + ' returned an abrupt completion');

      if (_temp6 instanceof Completion) {
        _temp6 = _temp6.Value;
      }
    } // 5. Return Completion { [[Type]]: return, [[Value]]: promiseCapability.[[Promise]], [[Target]]: empty }.


    return new Completion({
      Type: 'return',
      Value: promiseCapability.Promise,
      Target: undefined
    });
  } // #sec-generator-function-definitions-runtime-semantics-evaluatebody
  // GeneratorBody : FunctionBody


  EvaluateBody_AsyncConciseBody.section = 'https://tc39.es/ecma262/#sec-async-arrow-function-definitions-EvaluateBody';
  function* EvaluateBody_GeneratorBody(GeneratorBody, functionObject, argumentsList) {
    let _temp7 = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);

    if (_temp7 instanceof AbruptCompletion) {
      return _temp7;
    }

    if (_temp7 instanceof Completion) {
      _temp7 = _temp7.Value;
    }

    let _temp8 = OrdinaryCreateFromConstructor(functionObject, '%GeneratorFunction.prototype.prototype%', ['GeneratorState', 'GeneratorContext']);

    if (_temp8 instanceof AbruptCompletion) {
      return _temp8;
    }

    if (_temp8 instanceof Completion) {
      _temp8 = _temp8.Value;
    }

    const G = _temp8; // 3. Perform GeneratorStart(G, FunctionBody).

    GeneratorStart(G, GeneratorBody); // 4. Return Completion { [[Type]]: return, [[Value]]: G, [[Target]]: empty }.

    return new Completion({
      Type: 'return',
      Value: G,
      Target: undefined
    });
  } // #sec-asyncgenerator-definitions-evaluatebody
  // AsyncGeneratorBody : FunctionBody

  function* EvaluateBody_AsyncGeneratorBody(FunctionBody, functionObject, argumentsList) {
    let _temp9 = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);

    if (_temp9 instanceof AbruptCompletion) {
      return _temp9;
    }

    if (_temp9 instanceof Completion) {
      _temp9 = _temp9.Value;
    }

    let _temp10 = OrdinaryCreateFromConstructor(functionObject, '%AsyncGeneratorFunction.prototype.prototype%', ['AsyncGeneratorState', 'AsyncGeneratorContext', 'AsyncGeneratorQueue']);

    if (_temp10 instanceof AbruptCompletion) {
      return _temp10;
    }

    if (_temp10 instanceof Completion) {
      _temp10 = _temp10.Value;
    }

    const generator = _temp10; // 3. Perform ! AsyncGeneratorStart(generator, FunctionBody).

    let _temp11 = AsyncGeneratorStart(generator, FunctionBody);

    Assert(!(_temp11 instanceof AbruptCompletion), "AsyncGeneratorStart(generator, FunctionBody)" + ' returned an abrupt completion');

    if (_temp11 instanceof Completion) {
      _temp11 = _temp11.Value;
    }

    return new Completion({
      Type: 'return',
      Value: generator,
      Target: undefined
    });
  } // #sec-async-function-definitions-EvaluateBody
  // AsyncFunctionBody : FunctionBody

  function* EvaluateBody_AsyncFunctionBody(FunctionBody, functionObject, argumentsList) {
    let _temp12 = NewPromiseCapability(exports.surroundingAgent.intrinsic('%Promise%'));

    Assert(!(_temp12 instanceof AbruptCompletion), "NewPromiseCapability(surroundingAgent.intrinsic('%Promise%'))" + ' returned an abrupt completion');

    if (_temp12 instanceof Completion) {
      _temp12 = _temp12.Value;
    }

    // 1. Let promiseCapability be ! NewPromiseCapability(%Promise%).
    const promiseCapability = _temp12; // 2. Let declResult be FunctionDeclarationInstantiation(functionObject, argumentsList).

    const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList); // 3. If declResult is not an abrupt completion, then

    if (!(declResult instanceof AbruptCompletion)) {
      let _temp13 = AsyncFunctionStart(promiseCapability, FunctionBody);

      Assert(!(_temp13 instanceof AbruptCompletion), "AsyncFunctionStart(promiseCapability, FunctionBody)" + ' returned an abrupt completion');

      if (_temp13 instanceof Completion) {
        _temp13 = _temp13.Value;
      }
    } else {
      let _temp14 = Call(promiseCapability.Reject, Value.undefined, [declResult.Value]);

      Assert(!(_temp14 instanceof AbruptCompletion), "Call(promiseCapability.Reject, Value.undefined, [declResult.Value])" + ' returned an abrupt completion');

      if (_temp14 instanceof Completion) {
        _temp14 = _temp14.Value;
      }
    } // 5. Return Completion { [[Type]]: return, [[Value]]: promiseCapability.[[Promise]], [[Target]]: empty }.


    return new Completion({
      Type: 'return',
      Value: promiseCapability.Promise,
      Target: undefined
    });
  } // FunctionBody : FunctionStatementList
  // ConciseBody : ExpressionBody
  // GeneratorBody : FunctionBody
  // AsyncGeneratorBody : FunctionBody
  // AsyncFunctionBody : FunctionBody
  // AsyncConciseBody : ExpressionBody

  function EvaluateBody(Body, functionObject, argumentsList) {
    switch (Body.type) {
      case 'FunctionBody':
        return EvaluateBody_FunctionBody(Body, functionObject, argumentsList);

      case 'ConciseBody':
        return EvaluateBody_ConciseBody(Body, functionObject, argumentsList);

      case 'GeneratorBody':
        return EvaluateBody_GeneratorBody(Body, functionObject, argumentsList);

      case 'AsyncGeneratorBody':
        return EvaluateBody_AsyncGeneratorBody(Body, functionObject, argumentsList);

      case 'AsyncFunctionBody':
        return EvaluateBody_AsyncFunctionBody(Body, functionObject, argumentsList);

      case 'AsyncConciseBody':
        return EvaluateBody_AsyncConciseBody(Body, functionObject, argumentsList);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('EvaluateBody', Body);
    }
  }

  function* FunctionDeclarationInstantiation(func, argumentsList) {
    // 1. Let calleeContext be the running execution context.
    const calleeContext = exports.surroundingAgent.runningExecutionContext; // 2. Let code be func.[[ECMAScriptCode]].

    const code = func.ECMAScriptCode; // 3. Let strict be func.[[Strict]].

    const strict = func.Strict; // 4. Let formals be func.[[FormalParameters]].

    const formals = func.FormalParameters; // 5. Let parameterNames be BoundNames of formals.

    const parameterNames = BoundNames(formals); // 6. If parameterNames has any duplicate entries, let hasDuplicates be true. Otherwise, let hasDuplicates be false.

    const hasDuplicates = new ValueSet(parameterNames).size !== parameterNames.length; // 7. Let simpleParameterList be IsSimpleParameterList of formals.

    const simpleParameterList = IsSimpleParameterList(formals); // 8. Let hasParameterExpressions be ContainsExpression of formals.

    const hasParameterExpressions = ContainsExpression(formals); // 9. Let varNames be the VarDeclaredNames of code.

    const varNames = VarDeclaredNames(code); // 10. Let varDeclarations be the VarScopedDeclarations of code.

    const varDeclarations = VarScopedDeclarations(code); // 11. Let lexicalNames be the LexicallyDeclaredNames of code.

    const lexicalNames = new ValueSet(LexicallyDeclaredNames(code)); // 12. Let functionNames be a new empty List.

    const functionNames = new ValueSet(); // 13. Let functionNames be a new empty List.

    const functionsToInitialize = []; // 14. For each d in varDeclarations, in reverse list order, do

    for (const d of [...varDeclarations].reverse()) {
      // a. If d is neither a VariableDeclaration nor a ForBinding nor a BindingIdentifier, then
      if (d.type !== 'VariableDeclaration' && d.type !== 'ForBinding' && d.type !== 'BindingIdentifier') {
        // i. Assert: d is either a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration.
        Assert(d.type === 'FunctionDeclaration' || d.type === 'GeneratorDeclaration' || d.type === 'AsyncFunctionDeclaration' || d.type === 'AsyncGeneratorDeclaration', "d.type === 'FunctionDeclaration'\n             || d.type === 'GeneratorDeclaration'\n             || d.type === 'AsyncFunctionDeclaration'\n             || d.type === 'AsyncGeneratorDeclaration'"); // ii. Let fn be the sole element of the BoundNames of d.

        const fn = BoundNames(d)[0]; // iii. If fn is not an element of functionNames, then

        if (!functionNames.has(fn)) {
          // 1. Insert fn as the first element of functionNames.
          functionNames.add(fn); // 2. NOTE: If there are multiple function declarations for the same name, the last declaration is used.
          // 3. Insert d as the first element of functionsToInitialize.

          functionsToInitialize.unshift(d);
        }
      }
    } // 15. Let argumentsObjectNeeded be true.


    let argumentsObjectNeeded = true; // If func.[[ThisMode]] is lexical, then

    if (func.ThisMode === 'lexical') {
      // a. NOTE: Arrow functions never have an arguments objects.
      // b. Set argumentsObjectNeeded to false.
      argumentsObjectNeeded = false;
    } else if (new ValueSet(parameterNames).has(new Value('arguments'))) {
      // a. Set argumentsObjectNeeded to false.
      argumentsObjectNeeded = false;
    } else if (hasParameterExpressions === false) {
      // a. If "arguments" is an element of functionNames or if "arguments" is an element of lexicalNames, then
      if (functionNames.has(new Value('arguments')) || lexicalNames.has(new Value('arguments'))) {
        // i. Set argumentsObjectNeeded to false.
        argumentsObjectNeeded = false;
      }
    }

    let env; // 19. If strict is true or if hasParameterExpressions is false, then

    if (strict || hasParameterExpressions === false) {
      // a. NOTE: Only a single lexical environment is needed for the parameters and top-level vars.
      // b. Let env be the LexicalEnvironment of calleeContext.
      env = calleeContext.LexicalEnvironment;
    } else {
      // a. NOTE: A separate Environment Record is needed to ensure that bindings created by direct eval
      //    calls in the formal parameter list are outside the environment where parameters are declared.
      // b. Let calleeEnv be the LexicalEnvironment of calleeContext.
      const calleeEnv = calleeContext.LexicalEnvironment; // c. Let env be NewDeclarativeEnvironment(calleeEnv).

      env = NewDeclarativeEnvironment(calleeEnv); // d. Assert: The VariableEnvironment of calleeContext is calleeEnv.

      Assert(calleeContext.VariableEnvironment === calleeEnv, "calleeContext.VariableEnvironment === calleeEnv"); // e. Set the LexicalEnvironment of calleeContext to env.

      calleeContext.LexicalEnvironment = env;
    } // 21. For each String paramName in parameterNames, do


    for (const paramName of parameterNames) {
      // a. Let alreadyDeclared be env.HasBinding(paramName).
      const alreadyDeclared = env.HasBinding(paramName); // b. NOTE: Early errors ensure that duplicate parameter names can only occur in
      //    non-strict functions that do not have parameter default values or rest parameters.
      // c. If alreadyDeclared is false, then

      if (alreadyDeclared === Value.false) {
        let _temp = env.CreateMutableBinding(paramName, Value.false);

        Assert(!(_temp instanceof AbruptCompletion), "env.CreateMutableBinding(paramName, Value.false)" + ' returned an abrupt completion');
        /* istanbul ignore if */

        if (_temp instanceof Completion) {
          _temp = _temp.Value;
        }

        if (hasDuplicates === true) {
          let _temp2 = env.InitializeBinding(paramName, Value.undefined);

          Assert(!(_temp2 instanceof AbruptCompletion), "env.InitializeBinding(paramName, Value.undefined)" + ' returned an abrupt completion');

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }
        }
      }
    } // 22. If argumentsObjectNeeded is true, then


    let parameterBindings;

    if (argumentsObjectNeeded === true) {
      let ao; // a. If strict is true or if simpleParameterList is false, then

      if (strict || simpleParameterList === false) {
        // i. Let ao be CreateUnmappedArgumentsObject(argumentsList).
        ao = CreateUnmappedArgumentsObject(argumentsList);
      } else {
        // i. NOTE: mapped argument object is only provided for non-strict functions
        //    that don't have a rest parameter, any parameter default value initializers,
        //    or any destructured parameters.
        // ii. Let ao be CreateMappedArgumentsObject(func, formals, argumentsList, env).
        ao = CreateMappedArgumentsObject(func, formals, argumentsList, env);
      } // c. If strict is true, then


      if (strict) {
        let _temp3 = env.CreateImmutableBinding(new Value('arguments'), Value.false);

        Assert(!(_temp3 instanceof AbruptCompletion), "env.CreateImmutableBinding(new Value('arguments'), Value.false)" + ' returned an abrupt completion');

        if (_temp3 instanceof Completion) {
          _temp3 = _temp3.Value;
        }
      } else {
        let _temp4 = env.CreateMutableBinding(new Value('arguments'), Value.false);

        Assert(!(_temp4 instanceof AbruptCompletion), "env.CreateMutableBinding(new Value('arguments'), Value.false)" + ' returned an abrupt completion');

        if (_temp4 instanceof Completion) {
          _temp4 = _temp4.Value;
        }
      } // e. Call env.InitializeBinding("arguments", ao).


      env.InitializeBinding(new Value('arguments'), ao); // f. Let parameterBindings be a new List of parameterNames with "arguments" appended.

      parameterBindings = new ValueSet([...parameterNames, new Value('arguments')]);
    } else {
      // a. Let parameterBindings be parameterNames.
      parameterBindings = new ValueSet(parameterNames);
    } // 24. Let iteratorRecord be CreateListIteratorRecord(argumentsList).


    const iteratorRecord = CreateListIteratorRecord(argumentsList); // 25. If hasDuplicates is true, then

    if (hasDuplicates) {
      let _temp5 = yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, Value.undefined);
      /* istanbul ignore if */


      if (_temp5 instanceof AbruptCompletion) {
        return _temp5;
      }
      /* istanbul ignore if */


      if (_temp5 instanceof Completion) {
        _temp5 = _temp5.Value;
      }
    } else {
      let _temp6 = yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, env);

      if (_temp6 instanceof AbruptCompletion) {
        return _temp6;
      }

      if (_temp6 instanceof Completion) {
        _temp6 = _temp6.Value;
      }
    }

    let varEnv; // 27. If hasParameterExpressions is false, then

    if (hasParameterExpressions === false) {
      // a. NOTE: Only a single lexical environment is needed for the parameters and top-level vars.
      // b. Let instantiatedVarNames be a copy of the List parameterBindings.
      const instantiatedVarNames = new ValueSet(parameterBindings); // c. For each n in varNames, do

      for (const n of varNames) {
        // i. If n is not an element of instantiatedVarNames, then
        if (!instantiatedVarNames.has(n)) {
          // 1. Append n to instantiatedVarNames.
          instantiatedVarNames.add(n); // 2. Perform ! env.CreateMutableBinding(n, false).

          let _temp7 = env.CreateMutableBinding(n, Value.false);

          Assert(!(_temp7 instanceof AbruptCompletion), "env.CreateMutableBinding(n, Value.false)" + ' returned an abrupt completion');

          if (_temp7 instanceof Completion) {
            _temp7 = _temp7.Value;
          }

          env.InitializeBinding(n, Value.undefined);
        }
      } // d. Let varEnv be env.


      varEnv = env;
    } else {
      // a. NOTE: A separate Environment Record is needed to ensure that closures created by expressions
      //    in the formal parameter list do not have visibility of declarations in the function body.
      // b. Let varEnv be NewDeclarativeEnvironment(env).
      varEnv = NewDeclarativeEnvironment(env); // c. Set the VariableEnvironment of calleeContext to varEnv.

      calleeContext.VariableEnvironment = varEnv; // d. Let instantiatedVarNames be a new empty List.

      const instantiatedVarNames = new ValueSet(); // e. For each n in varNames, do

      for (const n of varNames) {
        // If n is not an element of instantiatedVarNames, then
        if (!instantiatedVarNames.has(n)) {
          // 1. Append n to instantiatedVarNames.
          instantiatedVarNames.add(n); // 2. Perform ! varEnv.CreateMutableBinding(n, false).

          let _temp8 = varEnv.CreateMutableBinding(n, Value.false);

          Assert(!(_temp8 instanceof AbruptCompletion), "varEnv.CreateMutableBinding(n, Value.false)" + ' returned an abrupt completion');

          if (_temp8 instanceof Completion) {
            _temp8 = _temp8.Value;
          }
          let initialValue; // 3. If n is not an element of parameterBindings or if n is an element of functionNames, let initialValue be undefined.

          if (!parameterBindings.has(n) || functionNames.has(n)) {
            initialValue = Value.undefined;
          } else {
            let _temp9 = env.GetBindingValue(n, Value.false);

            Assert(!(_temp9 instanceof AbruptCompletion), "env.GetBindingValue(n, Value.false)" + ' returned an abrupt completion');

            if (_temp9 instanceof Completion) {
              _temp9 = _temp9.Value;
            }

            // a. Let initialValue be ! env.GetBindingValue(n, false).
            initialValue = _temp9;
          } // 5. Call varEnv.InitializeBinding(n, initialValue).


          varEnv.InitializeBinding(n, initialValue); // 6. NOTE: vars whose names are the same as a formal parameter, initially have the same value as the corresponding initialized parameter.
        }
      }
    } // 29. NOTE: Annex B.3.3.1 adds additional steps at this point.


    let lexEnv; // 30. If strict is false, then

    if (strict === false) {
      // a. Let lexEnv be NewDeclarativeEnvironment(varEnv).
      lexEnv = NewDeclarativeEnvironment(varEnv); // b. NOTE: Non-strict functions use a separate lexical Environment Record for top-level lexical declarations
      //    so that a direct eval can determine whether any var scoped declarations introduced by the eval code
      //    conflict with pre-existing top-level lexically scoped declarations. This is not needed for strict functions
      //    because a strict direct eval always places all declarations into a new Environment Record.
    } else {
      // a. Else, let lexEnv be varEnv.
      lexEnv = varEnv;
    } // 32. Set the LexicalEnvironment of calleeContext to lexEnv.


    calleeContext.LexicalEnvironment = lexEnv; // 33. Let lexDeclarations be the LexicallyScopedDeclarations of code.

    const lexDeclarations = LexicallyScopedDeclarations(code); // 34. For each element d in lexDeclarations, do

    for (const d of lexDeclarations) {
      // a. NOTE: A lexically declared name cannot be the same as a function/generator declaration, formal
      //    parameter, or a var name. Lexically declared names are only instantiated here but not initialized.
      // b. For each element dn of the BoundNames of d, do
      for (const dn of BoundNames(d)) {
        // i. If IsConstantDeclaration of d is true, then
        if (IsConstantDeclaration(d)) {
          let _temp10 = lexEnv.CreateImmutableBinding(dn, Value.true);

          Assert(!(_temp10 instanceof AbruptCompletion), "lexEnv.CreateImmutableBinding(dn, Value.true)" + ' returned an abrupt completion');

          if (_temp10 instanceof Completion) {
            _temp10 = _temp10.Value;
          }
        } else {
          let _temp11 = lexEnv.CreateMutableBinding(dn, Value.false);

          Assert(!(_temp11 instanceof AbruptCompletion), "lexEnv.CreateMutableBinding(dn, Value.false)" + ' returned an abrupt completion');

          if (_temp11 instanceof Completion) {
            _temp11 = _temp11.Value;
          }
        }
      }
    } // 35. For each Parse Node f in functionsToInitialize, do


    for (const f of functionsToInitialize) {
      // a. Let fn be the sole element of the BoundNames of f.
      const fn = BoundNames(f)[0]; // b. Let fo be InstantiateFunctionObject of f with argument lexEnv.

      const fo = InstantiateFunctionObject(f, lexEnv); // c. Perform ! varEnv.SetMutableBinding(fn, fo, false).

      let _temp12 = varEnv.SetMutableBinding(fn, fo, Value.false);

      Assert(!(_temp12 instanceof AbruptCompletion), "varEnv.SetMutableBinding(fn, fo, Value.false)" + ' returned an abrupt completion');

      if (_temp12 instanceof Completion) {
        _temp12 = _temp12.Value;
      }
    } // 36. Return NormalCompletion(empty).


    return NormalCompletion(undefined);
  }

  //   FunctionStatementList : [empty]
  //
  // (implicit)
  //   FunctionStatementList : StatementList

  function Evaluate_FunctionStatementList(FunctionStatementList) {
    return Evaluate_StatementList(FunctionStatementList);
  }

  // FormalParameters :
  //   [empty]
  //   FormalParameterList `,` FunctionRestParameter

  function* IteratorBindingInitialization_FormalParameters(FormalParameters, iteratorRecord, environment) {
    if (FormalParameters.length === 0) {
      // 1. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    }

    for (const FormalParameter of FormalParameters.slice(0, -1)) {
      let _temp = yield* IteratorBindingInitialization_FormalParameter(FormalParameter, iteratorRecord, environment);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }
    }

    const last = FormalParameters[FormalParameters.length - 1];

    if (last.type === 'BindingRestElement') {
      return yield* IteratorBindingInitialization_FunctionRestParameter(last, iteratorRecord, environment);
    }

    return yield* IteratorBindingInitialization_FormalParameter(last, iteratorRecord, environment);
  } // FormalParameter : BindingElement

  function IteratorBindingInitialization_FormalParameter(BindingElement, iteratorRecord, environment) {
    return IteratorBindingInitialization_BindingElement(BindingElement, iteratorRecord, environment);
  } // FunctionRestParameter : BindingRestElement


  function IteratorBindingInitialization_FunctionRestParameter(FunctionRestParameter, iteratorRecord, environment) {
    return IteratorBindingInitialization_BindingRestElement(FunctionRestParameter, iteratorRecord, environment);
  } // BindingElement :
  //   SingleNameBinding
  //   BindingPattern


  function IteratorBindingInitialization_BindingElement(BindingElement, iteratorRecord, environment) {
    if (BindingElement.BindingPattern) {
      return IteratorBindingInitialization_BindingPattern(BindingElement, iteratorRecord, environment);
    }

    return IteratorBindingInitialization_SingleNameBinding(BindingElement, iteratorRecord, environment);
  } // SingleNameBinding : BindingIdentifier Initializer?


  function* IteratorBindingInitialization_SingleNameBinding({
    BindingIdentifier,
    Initializer
  }, iteratorRecord, environment) {
    // 1. Let bindingId be StringValue of BindingIdentifier.
    const bindingId = StringValue(BindingIdentifier); // 2. Let lhs be ? ResolveBinding(bindingId, environment).

    let _temp2 = ResolveBinding(bindingId, environment, BindingIdentifier.strict);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const lhs = _temp2;
    let v; // 3. If iteratorRecord.[[Done]] is false, then

    if (iteratorRecord.Done === Value.false) {
      // a. Let next be IteratorStep(iteratorRecord).
      let next = IteratorStep(iteratorRecord); // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

      if (next instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      } // c. ReturnIfAbrupt(next).


      /* istanbul ignore if */
      if (next instanceof AbruptCompletion) {
        return next;
      }
      /* istanbul ignore if */


      if (next instanceof Completion) {
        next = next.Value;
      }

      if (next === Value.false) {
        iteratorRecord.Done = Value.true;
      } else {
        // e. Else,
        // i. Let v be IteratorValue(next).
        v = IteratorValue(next); // ii. If v is an abrupt completion, set iteratorRecord.[[Done]] to true.

        if (v instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        } // iii. ReturnIfAbrupt(v).


        if (v instanceof AbruptCompletion) {
          return v;
        }

        if (v instanceof Completion) {
          v = v.Value;
        }
      }
    } // 4. If iteratorRecord.[[Done]] is true, let v be undefined.


    if (iteratorRecord.Done === Value.true) {
      v = Value.undefined;
    } // 5. If Initializer is present and v is undefined, then


    if (Initializer && v === Value.undefined) {
      if (IsAnonymousFunctionDefinition(Initializer)) {
        v = yield* NamedEvaluation(Initializer, bindingId);
      } else {
        const defaultValue = yield* Evaluate(Initializer);

        let _temp3 = GetValue(defaultValue);

        if (_temp3 instanceof AbruptCompletion) {
          return _temp3;
        }

        if (_temp3 instanceof Completion) {
          _temp3 = _temp3.Value;
        }

        v = _temp3;
      }
    } // 6. If environment is undefined, return ? PutValue(lhs, v).


    if (environment === Value.undefined) {
      return PutValue(lhs, v);
    } // 7. Return InitializeReferencedBinding(lhs, v).


    return InitializeReferencedBinding(lhs, v);
  } // BindingRestElement :
  //   `...` BindingIdentiifer
  //   `...` BindingPattern


  function* IteratorBindingInitialization_BindingRestElement({
    BindingIdentifier,
    BindingPattern
  }, iteratorRecord, environment) {
    if (BindingIdentifier) {
      let _temp4 = ResolveBinding(StringValue(BindingIdentifier), environment, BindingIdentifier.strict);

      if (_temp4 instanceof AbruptCompletion) {
        return _temp4;
      }

      if (_temp4 instanceof Completion) {
        _temp4 = _temp4.Value;
      }

      // 1. Let lhs be ? ResolveBinding(StringValue of BindingIdentifier, environment).
      const lhs = _temp4; // 2. Let A be ! ArrayCreate(0).

      let _temp5 = ArrayCreate(new Value(0));

      Assert(!(_temp5 instanceof AbruptCompletion), "ArrayCreate(new Value(0))" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp5 instanceof Completion) {
        _temp5 = _temp5.Value;
      }

      const A = _temp5; // 3. Let n be 0.

      let n = 0; // 4. Repeat,

      while (true) {
        let next; // a. If iteratorRecord.[[Done]] is false, then

        if (iteratorRecord.Done === Value.false) {
          // i. Let next be IteratorStep(iteratorRecord).
          next = IteratorStep(iteratorRecord); // ii. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

          if (next instanceof AbruptCompletion) {
            iteratorRecord.Done = Value.true;
          } // iii. ReturnIfAbrupt(next).


          if (next instanceof AbruptCompletion) {
            return next;
          }

          if (next instanceof Completion) {
            next = next.Value;
          }

          if (next === Value.false) {
            iteratorRecord.Done = Value.true;
          }
        } // b. If iteratorRecord.[[Done]] is true, then


        if (iteratorRecord.Done === Value.true) {
          // i. If environment is undefined, return ? PutValue(lhs, A).
          if (environment === Value.undefined) {
            return PutValue(lhs, A);
          } // ii. Return InitializeReferencedBinding(lhs, A).


          return InitializeReferencedBinding(lhs, A);
        } // c. Let nextValue be IteratorValue(next).


        let nextValue = IteratorValue(next); // d. If nextValue is an abrupt completion, set iteratorRecord.[[Done]] to true.

        if (nextValue instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        } // e. ReturnIfAbrupt(nextValue).


        if (nextValue instanceof AbruptCompletion) {
          return nextValue;
        }

        if (nextValue instanceof Completion) {
          nextValue = nextValue.Value;
        }

        let _temp7 = ToString(new Value(n));

        Assert(!(_temp7 instanceof AbruptCompletion), "ToString(new Value(n))" + ' returned an abrupt completion');

        if (_temp7 instanceof Completion) {
          _temp7 = _temp7.Value;
        }

        let _temp6 = CreateDataPropertyOrThrow(A, _temp7, nextValue);

        Assert(!(_temp6 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(A, X(ToString(new Value(n))), nextValue)" + ' returned an abrupt completion');

        if (_temp6 instanceof Completion) {
          _temp6 = _temp6.Value;
        }

        n += 1;
      }
    } else {
      let _temp8 = ArrayCreate(new Value(0));

      Assert(!(_temp8 instanceof AbruptCompletion), "ArrayCreate(new Value(0))" + ' returned an abrupt completion');

      if (_temp8 instanceof Completion) {
        _temp8 = _temp8.Value;
      }

      // 1. Let A be ! ArrayCreate(0).
      const A = _temp8; // 2. Let n be 0.

      let n = 0; // 3. Repeat,

      while (true) {
        let next; // a. If iteratorRecord.[[Done]] is false, then

        if (iteratorRecord.Done === Value.false) {
          // i. Let next be IteratorStep(iteratorRecord).
          next = IteratorStep(iteratorRecord); // ii. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

          if (next instanceof AbruptCompletion) {
            iteratorRecord.Done = Value.true;
          } // iii. ReturnIfAbrupt(next).


          if (next instanceof AbruptCompletion) {
            return next;
          }

          if (next instanceof Completion) {
            next = next.Value;
          }

          if (next === Value.false) {
            iteratorRecord.Done = Value.true;
          }
        } // b. If iteratorRecord.[[Done]] is true, then


        if (iteratorRecord.Done === Value.true) {
          // i. Return the result of performing BindingInitialization of BindingPattern with A and environment as the arguments.
          return yield* BindingInitialization(BindingPattern, A, environment);
        } // c. Let nextValue be IteratorValue(next).


        let nextValue = IteratorValue(next); // d. If nextValue is an abrupt completion, set iteratorRecord.[[Done]] to true.

        if (nextValue instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        } // e. ReturnIfAbrupt(nextValue).


        if (nextValue instanceof AbruptCompletion) {
          return nextValue;
        }

        if (nextValue instanceof Completion) {
          nextValue = nextValue.Value;
        }

        let _temp10 = ToString(new Value(n));

        Assert(!(_temp10 instanceof AbruptCompletion), "ToString(new Value(n))" + ' returned an abrupt completion');

        if (_temp10 instanceof Completion) {
          _temp10 = _temp10.Value;
        }

        let _temp9 = CreateDataPropertyOrThrow(A, _temp10, nextValue);

        Assert(!(_temp9 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(A, X(ToString(new Value(n))), nextValue)" + ' returned an abrupt completion');

        if (_temp9 instanceof Completion) {
          _temp9 = _temp9.Value;
        }

        n += 1;
      }
    }
  }

  function* IteratorBindingInitialization_BindingPattern({
    BindingPattern,
    Initializer
  }, iteratorRecord, environment) {
    let v; // 1. If iteratorRecord.[[Done]] is false, then

    if (iteratorRecord.Done === Value.false) {
      // a. Let next be IteratorStep(iteratorRecord).
      let next = IteratorStep(iteratorRecord); // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

      if (next instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      } // c. ReturnIfAbrupt(next).


      if (next instanceof AbruptCompletion) {
        return next;
      }

      if (next instanceof Completion) {
        next = next.Value;
      }

      if (next === Value.false) {
        iteratorRecord.Done = Value.true;
      } else {
        // e. Else,
        // i. Let v be IteratorValue(next).
        v = IteratorValue(next); // ii. If v is an abrupt completion, set iteratorRecord.[[Done]] to true.

        if (v instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        } // iii. ReturnIfAbrupt(v).


        if (v instanceof AbruptCompletion) {
          return v;
        }

        if (v instanceof Completion) {
          v = v.Value;
        }
      }
    } // 2. If iteratorRecord.[[Done]] is true, let v be undefined.


    if (iteratorRecord.Done === Value.true) {
      v = Value.undefined;
    } // 3. If Initializer is present and v is undefined, then


    if (Initializer && v === Value.undefined) {
      // a. Let defaultValue be the result of evaluating Initializer.
      const defaultValue = yield* Evaluate(Initializer); // b. Set v to ? GetValue(defaultValue).

      let _temp11 = GetValue(defaultValue);

      if (_temp11 instanceof AbruptCompletion) {
        return _temp11;
      }

      if (_temp11 instanceof Completion) {
        _temp11 = _temp11.Value;
      }

      v = _temp11;
    } // 4. Return the result of performing BindingInitialization of BindingPattern with v and environment as the arguments.


    return yield* BindingInitialization(BindingPattern, v, environment);
  }

  function IteratorDestructuringAssignmentEvaluation(node, iteratorRecord) {
    Assert(node.type === 'Elision', "node.type === 'Elision'"); // 1. If iteratorRecord.[[Done]] is false, then

    if (iteratorRecord.Done === Value.false) {
      // a. Let next be IteratorStep(iteratorRecord).
      let next = IteratorStep(iteratorRecord); // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

      if (next instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      } // c. ReturnIfAbrupt(next).


      if (next instanceof AbruptCompletion) {
        return next;
      }

      if (next instanceof Completion) {
        next = next.Value;
      }

      if (next === Value.false) {
        iteratorRecord.Done = Value.true;
      }
    } // 2. Return NormalCompletion(empty).


    return NormalCompletion(undefined);
  }

  function* IteratorBindingInitialization_ArrayBindingPattern({
    BindingElementList,
    BindingRestElement
  }, iteratorRecord, environment) {
    for (const BindingElement of BindingElementList) {
      if (BindingElement.type === 'Elision') {
        let _temp12 = IteratorDestructuringAssignmentEvaluation(BindingElement, iteratorRecord);

        if (_temp12 instanceof AbruptCompletion) {
          return _temp12;
        }

        if (_temp12 instanceof Completion) {
          _temp12 = _temp12.Value;
        }
      } else {
        let _temp13 = yield* IteratorBindingInitialization_BindingElement(BindingElement, iteratorRecord, environment);

        if (_temp13 instanceof AbruptCompletion) {
          return _temp13;
        }

        if (_temp13 instanceof Completion) {
          _temp13 = _temp13.Value;
        }
      }
    }

    if (BindingRestElement) {
      return yield* IteratorBindingInitialization_BindingRestElement(BindingRestElement, iteratorRecord, environment);
    }

    return NormalCompletion(undefined);
  }

  //  ReturnStatement :
  //    `return` `;`
  //    `return` Expression `;`

  function* Evaluate_ReturnStatement({
    Expression
  }) {
    if (!Expression) {
      // 1. Return Completion { [[Type]]: return, [[Value]]: undefined, [[Target]]: empty }.
      return new Completion({
        Type: 'return',
        Value: Value.undefined,
        Target: undefined
      });
    } // 1. Let exprRef be the result of evaluating Expression.


    const exprRef = yield* Evaluate(Expression); // 1. Let exprValue be ? GetValue(exprRef).

    let _temp = GetValue(exprRef);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    let exprValue = _temp; // 1. If ! GetGeneratorKind() is async, set exprValue to ? Await(exprValue).

    let _temp2 = GetGeneratorKind();

    Assert(!(_temp2 instanceof AbruptCompletion), "GetGeneratorKind()" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    if (_temp2 === 'async') {
      let _temp3 = yield* Await(exprValue);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      exprValue = _temp3;
    } // 1. Return Completion { [[Type]]: return, [[Value]]: exprValue, [[Target]]: empty }.


    return new Completion({
      Type: 'return',
      Value: exprValue,
      Target: undefined
    });
  }

  function* Evaluate_ParenthesizedExpression({
    Expression
  }) {
    // 1. Return the result of evaluating Expression. This may be of type Reference.
    return yield* Evaluate(Expression);
  }

  //   MemberExpression : MemberExpression `[` Expression `]`
  //   CallExpression : CallExpression `[` Expression `]`

  function* Evaluate_MemberExpression_Expression({
    strict,
    MemberExpression,
    Expression
  }) {
    // 1. Let baseReference be the result of evaluating |MemberExpression|.
    const baseReference = yield* Evaluate(MemberExpression); // 2. Let baseValue be ? GetValue(baseReference).

    let _temp = GetValue(baseReference);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const baseValue = _temp; // 3. If the code matched by this |MemberExpression| is strict mode code, let strict be true; else let strict be false.
    // 4. Return ? EvaluatePropertyAccessWithExpressionKey(baseValue, |Expression|, strict).

    return yield* EvaluatePropertyAccessWithExpressionKey(baseValue, Expression, strict);
  } // 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
  //   MemberExpression : MemberExpression `.` IdentifierName
  //   CallExpression : CallExpression `.` IdentifierName


  Evaluate_MemberExpression_Expression.section = 'https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation';

  function* Evaluate_MemberExpression_IdentifierName({
    strict,
    MemberExpression,
    IdentifierName
  }) {
    // 1. Let baseReference be the result of evaluating |MemberExpression|.
    const baseReference = yield* Evaluate(MemberExpression); // 2. Let baseValue be ? GetValue(baseReference).

    let _temp2 = GetValue(baseReference);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const baseValue = _temp2; // 3. If the code matched by this |MemberExpression| is strict mode code, let strict be true; else let strict be false.
    // 4. Return ? EvaluatePropertyAccessWithIdentifierKey(baseValue, |IdentifierName|, strict).

    return EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict);
  } // 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
  //   MemberExpression :
  //     MemberExpression `[` Expression `]`
  //     MemberExpression `.` IdentifierName
  //   CallExpression :
  //     CallExpression `[` Expression `]`
  //     CallExpression `.` IdentifierName


  Evaluate_MemberExpression_IdentifierName.section = 'https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation';
  function Evaluate_MemberExpression(MemberExpression) {
    switch (true) {
      case !!MemberExpression.Expression:
        return Evaluate_MemberExpression_Expression(MemberExpression);

      case !!MemberExpression.IdentifierName:
        return Evaluate_MemberExpression_IdentifierName(MemberExpression);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_MemberExpression', MemberExpression);
    }
  }

  function* EvaluatePropertyAccessWithExpressionKey(baseValue, expression, strict) {
    // 1. Let propertyNameReference be the result of evaluating expression.
    const propertyNameReference = yield* Evaluate(expression); // 2. Let propertyNameValue be ? GetValue(propertyNameReference).

    let _temp = GetValue(propertyNameReference);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const propertyNameValue = _temp; // 3. Let bv be ? RequireObjectCoercible(baseValue).

    let _temp2 = RequireObjectCoercible(baseValue);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const bv = _temp2; // 4. Let propertyKey be ? ToPropertyKey(propertyNameValue).

    let _temp3 = ToPropertyKey(propertyNameValue);

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const propertyKey = _temp3; // 5. Return a value of type Reference whose base value component is bv, whose
    //    referenced name component is propertyKey, and whose strict reference flag is strict.

    return new Reference({
      BaseValue: bv,
      ReferencedName: propertyKey,
      StrictReference: strict ? Value.true : Value.false
    });
  } // #sec-evaluate-identifier-key-property-access

  function EvaluatePropertyAccessWithIdentifierKey(baseValue, identifierName, strict) {
    // 1. Assert: identifierName is an IdentifierName.
    Assert(identifierName.type === 'IdentifierName', "identifierName.type === 'IdentifierName'"); // 2. Let bv be ? RequireObjectCoercible(baseValue).

    let _temp4 = RequireObjectCoercible(baseValue);

    if (_temp4 instanceof AbruptCompletion) {
      return _temp4;
    }

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    const bv = _temp4; // 3. Let propertyNameString be StringValue of IdentifierName

    const propertyNameString = StringValue(identifierName); // 4. Return a value of type Reference whose base value component is bv, whose
    //    referenced name component is propertyNameString, and whose strict reference flag is strict.

    return new Reference({
      BaseValue: bv,
      ReferencedName: propertyNameString,
      StrictReference: strict ? Value.true : Value.false
    });
  }

  //   LexicalBinding :
  //     BindingIdentifier
  //     BindingIdentifier Initializer

  function* Evaluate_LexicalBinding_BindingIdentifier({
    BindingIdentifier,
    Initializer,
    strict
  }) {
    if (Initializer) {
      // 1. Let bindingId be StringValue of BindingIdentifier.
      const bindingId = StringValue(BindingIdentifier); // 2. Let lhs be ResolveBinding(bindingId).

      let _temp = ResolveBinding(bindingId, undefined, strict);

      Assert(!(_temp instanceof AbruptCompletion), "ResolveBinding(bindingId, undefined, strict)" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      const lhs = _temp;
      let value; // 3. If IsAnonymousFunctionDefinition(Initializer) is true, then

      if (IsAnonymousFunctionDefinition(Initializer)) {
        // a. Let value be NamedEvaluation of Initializer with argument bindingId.
        value = yield* NamedEvaluation(Initializer, bindingId);
      } else {
        // 4. Else,
        // a. Let rhs be the result of evaluating Initializer.
        const rhs = yield* Evaluate(Initializer); // b. Let value be ? GetValue(rhs).

        let _temp2 = GetValue(rhs);
        /* istanbul ignore if */


        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }
        /* istanbul ignore if */


        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }

        value = _temp2;
      } // 5. Return InitializeReferencedBinding(lhs, value).


      return InitializeReferencedBinding(lhs, value);
    } else {
      // 1. Let lhs be ResolveBinding(StringValue of BindingIdentifier).
      const lhs = ResolveBinding(StringValue(BindingIdentifier), undefined, strict); // 2. Return InitializeReferencedBinding(lhs, undefined).

      return InitializeReferencedBinding(lhs, Value.undefined);
    }
  } // #sec-let-and-const-declarations-runtime-semantics-evaluation
  //   LexicalBinding : BindingPattern Initializer


  Evaluate_LexicalBinding_BindingIdentifier.section = 'https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation';

  function* Evaluate_LexicalBinding_BindingPattern(LexicalBinding) {
    const {
      BindingPattern,
      Initializer
    } = LexicalBinding;
    const rhs = yield* Evaluate(Initializer);

    let _temp3 = GetValue(rhs);

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const value = _temp3;
    const env = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment;
    return yield* BindingInitialization(BindingPattern, value, env);
  }

  Evaluate_LexicalBinding_BindingPattern.section = 'https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation';
  function* Evaluate_LexicalBinding(LexicalBinding) {
    switch (true) {
      case !!LexicalBinding.BindingIdentifier:
        return yield* Evaluate_LexicalBinding_BindingIdentifier(LexicalBinding);

      case !!LexicalBinding.BindingPattern:
        return yield* Evaluate_LexicalBinding_BindingPattern(LexicalBinding);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_LexicalBinding', LexicalBinding);
    }
  } // #sec-let-and-const-declarations-runtime-semantics-evaluation
  //   BindingList : BindingList `,` LexicalBinding
  //
  // (implicit)
  //   BindingList : LexicalBinding

  function* Evaluate_BindingList(BindingList) {
    // 1. Let next be the result of evaluating BindingList.
    // 2. ReturnIfAbrupt(next).
    // 3. Return the result of evaluating LexicalBinding.
    let next;

    for (const LexicalBinding of BindingList) {
      next = yield* Evaluate_LexicalBinding(LexicalBinding);

      /* istanbul ignore if */
      if (next instanceof AbruptCompletion) {
        return next;
      }
      /* istanbul ignore if */


      if (next instanceof Completion) {
        next = next.Value;
      }
    }

    return next;
  } // #sec-let-and-const-declarations-runtime-semantics-evaluation
  //   LexicalDeclaration : LetOrConst BindingList `;`

  function* Evaluate_LexicalDeclaration({
    BindingList
  }) {
    // 1. Let next be the result of evaluating BindingList.
    let next = yield* Evaluate_BindingList(BindingList); // 2. ReturnIfAbrupt(next).

    if (next instanceof AbruptCompletion) {
      return next;
    }

    if (next instanceof Completion) {
      next = next.Value;
    }

    return NormalCompletion(undefined);
  }

  //   ObjectLiteral :
  //     `{` `}`
  //     `{` PropertyDefinitionList `}`
  //     `{` PropertyDefinitionList `,` `}`

  function* Evaluate_ObjectLiteral({
    PropertyDefinitionList
  }) {
    // 1. Let obj be OrdinaryObjectCreate(%Object.prototype%).
    const obj = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%Object.prototype%'));

    if (PropertyDefinitionList.length === 0) {
      return obj;
    } // 2. Perform ? PropertyDefinitionEvaluation of PropertyDefinitionList with arguments obj and true.


    let _temp = yield* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefinitionList, obj, Value.true);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    return obj;
  }

  //   PropertyDefinitionList :
  //     PropertyDefinitionList `,` PropertyDefinition

  function* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefinitionList, object, enumerable) {
    let lastReturn;

    for (const PropertyDefinition of PropertyDefinitionList) {
      let _temp = yield* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      lastReturn = _temp;
    }

    return lastReturn;
  } // PropertyDefinition :
  //   `...` AssignmentExpression
  //   IdentifierReference
  //   PropertyName `:` AssignmentExpression

  function* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable) {
    var _surroundingAgent$run, _surroundingAgent$run2, _surroundingAgent$run3;

    switch (PropertyDefinition.type) {
      case 'IdentifierReference':
        return yield* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(PropertyDefinition, object, enumerable);

      case 'PropertyDefinition':
        break;

      case 'MethodDefinition':
        return yield* PropertyDefinitionEvaluation_MethodDefinition(PropertyDefinition, object, enumerable);

      case 'GeneratorMethod':
        return yield* PropertyDefinitionEvaluation_GeneratorMethod(PropertyDefinition, object, enumerable);

      case 'AsyncMethod':
        return yield* PropertyDefinitionEvaluation_AsyncMethod(PropertyDefinition, object, enumerable);

      case 'AsyncGeneratorMethod':
        return yield* PropertyDefinitionEvaluation_AsyncGeneratorMethod(PropertyDefinition, object, enumerable);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('PropertyDefinitionEvaluation_PropertyDefinition', PropertyDefinition);
    } // PropertyDefinition :
    //   PropertyName `:` AssignmentExpression
    //   `...` AssignmentExpression


    const {
      PropertyName,
      AssignmentExpression
    } = PropertyDefinition;

    if (!PropertyName) {
      // 1. Let exprValue be the result of evaluating AssignmentExpression.
      const exprValue = yield* Evaluate(AssignmentExpression); // 2. Let fromValue be ? GetValue(exprValue).

      let _temp2 = GetValue(exprValue);

      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      const fromValue = _temp2; // 3. Let excludedNames be a new empty List.

      const excludedNames = []; // 4. Return ? CopyDataProperties(object, fromValue, excludedNames).

      return CopyDataProperties(object, fromValue, excludedNames);
    } // 1. Let propKey be the result of evaluating PropertyName.


    let propKey = yield* Evaluate_PropertyName(PropertyName); // 2. ReturnIfAbrupt(propKey).

    /* istanbul ignore if */
    if (propKey instanceof AbruptCompletion) {
      return propKey;
    }
    /* istanbul ignore if */


    if (propKey instanceof Completion) {
      propKey = propKey.Value;
    }

    let isProtoSetter;

    if ((_surroundingAgent$run = exports.surroundingAgent.runningExecutionContext) !== null && _surroundingAgent$run !== void 0 && (_surroundingAgent$run2 = _surroundingAgent$run.HostDefined) !== null && _surroundingAgent$run2 !== void 0 && (_surroundingAgent$run3 = _surroundingAgent$run2[kInternal]) !== null && _surroundingAgent$run3 !== void 0 && _surroundingAgent$run3.json) {
      isProtoSetter = false;
    } else if (!IsComputedPropertyKey(PropertyName) && propKey.stringValue() === '__proto__') {
      // 3. Else, If _propKey_ is the String value *"__proto__"* and if IsComputedPropertyKey(|PropertyName|) is *false*,
      // a. Let isProtoSetter be true.
      isProtoSetter = true;
    } else {
      // 4. Else,
      // a. Let isProtoSetter be false.
      isProtoSetter = false;
    }

    let propValue; // 5. If IsAnonymousFunctionDefinition(AssignmentExpression) is true and isProtoSetter is false, then

    if (IsAnonymousFunctionDefinition(AssignmentExpression) && !isProtoSetter) {
      // a. Let propValue be NamedEvaluation of AssignmentExpression with argument propKey.
      propValue = yield* NamedEvaluation(AssignmentExpression, propKey);
    } else {
      // 6. Else,
      // a. Let exprValueRef be the result of evaluating AssignmentExpression.
      const exprValueRef = yield* Evaluate(AssignmentExpression); // b. Let propValue be ? GetValue(exprValueRef).

      let _temp3 = GetValue(exprValueRef);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      propValue = _temp3;
    } // 7. If isProtoSetter is true, then


    if (isProtoSetter) {
      // a. If Type(propValue) is either Object or Null, then
      if (Type(propValue) === 'Object' || Type(propValue) === 'Null') {
        // i. Return object.[[SetPrototypeOf]](propValue).
        return object.SetPrototypeOf(propValue);
      } // b. Return NormalCompletion(empty).


      return NormalCompletion(undefined);
    } // 8. Assert: enumerable is true.


    Assert(enumerable === Value.true, "enumerable === Value.true"); // 9. Assert: object is an ordinary, extensible object with no non-configurable properties.
    // 10. Return ! CreateDataPropertyOrThrow(object, propKey, propValue).

    let _temp4 = CreateDataPropertyOrThrow(object, propKey, propValue);

    Assert(!(_temp4 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(object, propKey, propValue)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    return _temp4;
  } // PropertyDefinition : IdentifierReference


  function* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(IdentifierReference, object, enumerable) {
    // 1. Let propName be StringValue of IdentifierReference.
    const propName = StringValue(IdentifierReference); // 2. Let exprValue be the result of evaluating IdentifierReference.

    const exprValue = yield* Evaluate(IdentifierReference); // 3. Let propValue be ? GetValue(exprValue).

    let _temp5 = GetValue(exprValue);

    if (_temp5 instanceof AbruptCompletion) {
      return _temp5;
    }

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    const propValue = _temp5; // 4. Assert: enumerable is true.

    Assert(enumerable === Value.true, "enumerable === Value.true"); // 5. Assert: object is an ordinary, extensible object with no non-configurable properties.
    // 6. Return ! CreateDataPropertyOrThrow(object, propName, propValue).

    let _temp6 = CreateDataPropertyOrThrow(object, propName, propValue);

    Assert(!(_temp6 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(object, propName, propValue)" + ' returned an abrupt completion');

    if (_temp6 instanceof Completion) {
      _temp6 = _temp6.Value;
    }

    return _temp6;
  } // MethodDefinition :
  //   PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
  //   `get` PropertyName `(` `)` `{` FunctionBody `}`
  //   `set` PropertyName `(` PropertySetParameterList `)` `{` FunctionBody `}`


  function* PropertyDefinitionEvaluation_MethodDefinition(MethodDefinition, object, enumerable) {
    switch (true) {
      case !!MethodDefinition.UniqueFormalParameters:
        {
          let _temp7 = yield* DefineMethod(MethodDefinition, object);

          if (_temp7 instanceof AbruptCompletion) {
            return _temp7;
          }

          if (_temp7 instanceof Completion) {
            _temp7 = _temp7.Value;
          }

          // 1. Let methodDef be ? DefineMethod of MethodDefinition with argument object.
          const methodDef = _temp7; // 2. Perform SetFunctionName(methodDef.[[Closure]], methodDef.[[Key]]).

          SetFunctionName(methodDef.Closure, methodDef.Key); // 3. Let desc be the PropertyDescriptor { [[Value]]: methodDef.[[Closure]], [[Writable]]: true, [[Enumerable]]: enumerable, [[Configurable]]: true }.

          const desc = Descriptor({
            Value: methodDef.Closure,
            Writable: Value.true,
            Enumerable: enumerable,
            Configurable: Value.true
          }); // 4. Return ? DefinePropertyOrThrow(object, methodDef.[[Key]], desc).

          return DefinePropertyOrThrow(object, methodDef.Key, desc);
        }

      case !!MethodDefinition.PropertySetParameterList:
        {
          const {
            PropertyName,
            PropertySetParameterList,
            FunctionBody
          } = MethodDefinition; // 1. Let propKey be the result of evaluating PropertyName.

          let propKey = yield* Evaluate_PropertyName(PropertyName); // 2. ReturnIfAbrupt(propKey).

          if (propKey instanceof AbruptCompletion) {
            return propKey;
          }

          if (propKey instanceof Completion) {
            propKey = propKey.Value;
          }

          const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Let sourceText be the source text matched by MethodDefinition.

          const sourceText = sourceTextMatchedBy(MethodDefinition); // 5. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, PropertySetParameterList, FunctionBody, non-lexical-this, scope).

          const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%Function.prototype%'), sourceText, PropertySetParameterList, FunctionBody, 'non-lexical-this', scope); // 6. Perform MakeMethod(closure, object).

          MakeMethod(closure, object); // 7. Perform SetFunctionName(closure, propKey, "get").

          SetFunctionName(closure, propKey, new Value('set')); // 8. Let desc be the PropertyDescriptor { [[Get]]: closure, [[Enumerable]]: enumerable, [[Configurable]]: true }.

          const desc = Descriptor({
            Set: closure,
            Enumerable: enumerable,
            Configurable: Value.true
          }); // 9. Return ? DefinePropertyOrThrow(object, propKey, desc).

          return DefinePropertyOrThrow(object, propKey, desc);
        }

      case !MethodDefinition.UniqueFormalParameters && !MethodDefinition.PropertySetParameterList:
        {
          const {
            PropertyName,
            FunctionBody
          } = MethodDefinition; // 1. Let propKey be the result of evaluating PropertyName.

          let propKey = yield* Evaluate_PropertyName(PropertyName); // 2. ReturnIfAbrupt(propKey).

          if (propKey instanceof AbruptCompletion) {
            return propKey;
          }

          if (propKey instanceof Completion) {
            propKey = propKey.Value;
          }

          const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Let formalParameterList be an instance of the production FormalParameters : [empty].

          const formalParameterList = []; // 5. Let sourceText be the source text matched by MethodDefinition.

          const sourceText = sourceTextMatchedBy(MethodDefinition); // 6. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, formalParameterList, FunctionBody, non-lexical-this, scope).

          const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%Function.prototype%'), sourceText, formalParameterList, FunctionBody, 'non-lexical-this', scope); // 7. Perform MakeMethod(closure, object).

          MakeMethod(closure, object); // 8. Perform SetFunctionName(closure, propKey, "get").

          SetFunctionName(closure, propKey, new Value('get')); // 9. Let desc be the PropertyDescriptor { [[Get]]: closure, [[Enumerable]]: enumerable, [[Configurable]]: true }.

          const desc = Descriptor({
            Get: closure,
            Enumerable: enumerable,
            Configurable: Value.true
          }); // 10. Return ? DefinePropertyOrThrow(object, propKey, desc).

          return DefinePropertyOrThrow(object, propKey, desc);
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('PropertyDefinitionEvaluation_MethodDefinition', MethodDefinition);
    }
  } // #sec-async-function-definitions-PropertyDefinitionEvaluation
  //   AsyncMethod :
  //     `async` PropertyName `(` UniqueFormalParameters `)` `{` AsyncFunctionBody `}`


  function* PropertyDefinitionEvaluation_AsyncMethod(AsyncMethod, object, enumerable) {
    const {
      PropertyName,
      UniqueFormalParameters,
      AsyncFunctionBody
    } = AsyncMethod; // 1. Let propKey be the result of evaluating PropertyName.

    let propKey = yield* Evaluate_PropertyName(PropertyName); // 2. ReturnIfAbrupt(propKey).

    if (propKey instanceof AbruptCompletion) {
      return propKey;
    }

    if (propKey instanceof Completion) {
      propKey = propKey.Value;
    }

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Let sourceText be the source text matched by AsyncMethod.

    const sourceText = sourceTextMatchedBy(AsyncMethod); // 5. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, UniqueFormalParameters, AsyncFunctionBody, non-lexical-this, scope).

    let _temp8 = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, UniqueFormalParameters, AsyncFunctionBody, 'non-lexical-this', scope);

    Assert(!(_temp8 instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, UniqueFormalParameters, AsyncFunctionBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');

    if (_temp8 instanceof Completion) {
      _temp8 = _temp8.Value;
    }

    const closure = _temp8; // 6. Perform ! MakeMethod(closure, object).

    let _temp9 = MakeMethod(closure, object);

    Assert(!(_temp9 instanceof AbruptCompletion), "MakeMethod(closure, object)" + ' returned an abrupt completion');

    if (_temp9 instanceof Completion) {
      _temp9 = _temp9.Value;
    }

    let _temp10 = SetFunctionName(closure, propKey);

    Assert(!(_temp10 instanceof AbruptCompletion), "SetFunctionName(closure, propKey)" + ' returned an abrupt completion');

    if (_temp10 instanceof Completion) {
      _temp10 = _temp10.Value;
    }

    const desc = Descriptor({
      Value: closure,
      Writable: Value.true,
      Enumerable: enumerable,
      Configurable: Value.true
    }); // 9. Return ? DefinePropertyOrThrow(object, propKey, desc).

    return DefinePropertyOrThrow(object, propKey, desc);
  } // #sec-generator-function-definitions-runtime-semantics-propertydefinitionevaluation
  //   GeneratorMethod :
  //     `*` PropertyName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`


  PropertyDefinitionEvaluation_AsyncMethod.section = 'https://tc39.es/ecma262/#sec-async-function-definitions-PropertyDefinitionEvaluation';

  function* PropertyDefinitionEvaluation_GeneratorMethod(GeneratorMethod, object, enumerable) {
    const {
      PropertyName,
      UniqueFormalParameters,
      GeneratorBody
    } = GeneratorMethod; // 1. Let propKey be the result of evaluating PropertyName.

    let propKey = yield* Evaluate_PropertyName(PropertyName); // 2. ReturnIfAbrupt(propKey).

    if (propKey instanceof AbruptCompletion) {
      return propKey;
    }

    if (propKey instanceof Completion) {
      propKey = propKey.Value;
    }

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Let sourceText be the source text matched by GeneratorMethod.

    const sourceText = sourceTextMatchedBy(GeneratorMethod); // 5. Let closure be ! OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText, UniqueFormalParameters, AsyncFunctionBody, non-lexical-this, scope).

    let _temp11 = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, UniqueFormalParameters, GeneratorBody, 'non-lexical-this', scope);

    Assert(!(_temp11 instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, UniqueFormalParameters, GeneratorBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');

    if (_temp11 instanceof Completion) {
      _temp11 = _temp11.Value;
    }

    const closure = _temp11; // 6. Perform ! MakeMethod(closure, object).

    let _temp12 = MakeMethod(closure, object);

    Assert(!(_temp12 instanceof AbruptCompletion), "MakeMethod(closure, object)" + ' returned an abrupt completion');

    if (_temp12 instanceof Completion) {
      _temp12 = _temp12.Value;
    }

    let _temp13 = SetFunctionName(closure, propKey);

    Assert(!(_temp13 instanceof AbruptCompletion), "SetFunctionName(closure, propKey)" + ' returned an abrupt completion');

    if (_temp13 instanceof Completion) {
      _temp13 = _temp13.Value;
    }

    const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%')); // 9. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    })); // 10. Let desc be the PropertyDescriptor { [[Value]]: closure, [[Writable]]: true, [[Enumerable]]: enumerable, [[Configurable]]: true }.

    const desc = Descriptor({
      Value: closure,
      Writable: Value.true,
      Enumerable: enumerable,
      Configurable: Value.true
    }); // 11. Return ? DefinePropertyOrThrow(object, propKey, desc).

    return DefinePropertyOrThrow(object, propKey, desc);
  } // #sec-asyncgenerator-definitions-propertydefinitionevaluation
  //   AsyncGeneratorMethod :
  //     `async` `*` PropertyName `(` UniqueFormalParameters `)` `{` AsyncGeneratorBody `}`


  PropertyDefinitionEvaluation_GeneratorMethod.section = 'https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-propertydefinitionevaluation';

  function* PropertyDefinitionEvaluation_AsyncGeneratorMethod(AsyncGeneratorMethod, object, enumerable) {
    const {
      PropertyName,
      UniqueFormalParameters,
      AsyncGeneratorBody
    } = AsyncGeneratorMethod; // 1. Let propKey be the result of evaluating PropertyName.

    let propKey = yield* Evaluate_PropertyName(PropertyName); // 2. ReturnIfAbrupt(propKey).

    if (propKey instanceof AbruptCompletion) {
      return propKey;
    }

    if (propKey instanceof Completion) {
      propKey = propKey.Value;
    }

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Let sourceText be the source text matched by AsyncGeneratorMethod.

    const sourceText = sourceTextMatchedBy(AsyncGeneratorMethod); // 5. Let closure be ! OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, UniqueFormalParameters, AsyncGeneratorBody, non-lexical-this, scope).

    let _temp14 = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, UniqueFormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope);

    Assert(!(_temp14 instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, UniqueFormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');

    if (_temp14 instanceof Completion) {
      _temp14 = _temp14.Value;
    }

    const closure = _temp14; // 6. Perform ! MakeMethod(closure, object).

    let _temp15 = MakeMethod(closure, object);

    Assert(!(_temp15 instanceof AbruptCompletion), "MakeMethod(closure, object)" + ' returned an abrupt completion');

    if (_temp15 instanceof Completion) {
      _temp15 = _temp15.Value;
    }

    let _temp16 = SetFunctionName(closure, propKey);

    Assert(!(_temp16 instanceof AbruptCompletion), "SetFunctionName(closure, propKey)" + ' returned an abrupt completion');

    if (_temp16 instanceof Completion) {
      _temp16 = _temp16.Value;
    }

    const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%')); // 9. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    })); // 10. Let desc be the PropertyDescriptor { [[Value]]: closure, [[Writable]]: true, [[Enumerable]]: enumerable, [[Configurable]]: true }.

    const desc = Descriptor({
      Value: closure,
      Writable: Value.true,
      Enumerable: enumerable,
      Configurable: Value.true
    }); // 11. Return ? DefinePropertyOrThrow(object, propKey, desc).

    return DefinePropertyOrThrow(object, propKey, desc);
  }

  PropertyDefinitionEvaluation_AsyncGeneratorMethod.section = 'https://tc39.es/ecma262/#sec-asyncgenerator-definitions-propertydefinitionevaluation';
  function PropertyDefinitionEvaluation(node, object, enumerable) {
    switch (node.type) {
      case 'MethodDefinition':
        return PropertyDefinitionEvaluation_MethodDefinition(node, object, enumerable);

      case 'AsyncMethod':
        return PropertyDefinitionEvaluation_AsyncMethod(node, object, enumerable);

      case 'GeneratorMethod':
        return PropertyDefinitionEvaluation_GeneratorMethod(node, object, enumerable);

      case 'AsyncGeneratorMethod':
        return PropertyDefinitionEvaluation_AsyncGeneratorMethod(node, object, enumerable);

      case 'ClassElement':
        return PropertyDefinitionEvaluation(node.MethodDefinition, object, enumerable);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('PropertyDefinitionEvaluation', node);
    }
  }

  //   FunctionExpression :
  //     `function` `(` FormalParameters `)` `{` FunctionBody `}`
  //     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`

  function* Evaluate_FunctionExpression(FunctionExpression) {
    const {
      BindingIdentifier,
      FormalParameters,
      FunctionBody
    } = FunctionExpression;

    if (!BindingIdentifier) {
      return yield* NamedEvaluation(FunctionExpression, new Value(''));
    } // 1. Let scope be the running execution context's LexicalEnvironment.


    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let funcEnv be NewDeclarativeEnvironment(scope).

    const funcEnv = NewDeclarativeEnvironment(scope); // 3. Let name be StringValue of BindingIdentifier.

    const name = StringValue(BindingIdentifier); // 4. Perform funcEnv.CreateImmutableBinding(name, false).

    funcEnv.CreateImmutableBinding(name, Value.false); // 5. Let sourceText be the source text matched by FunctionExpression.

    const sourceText = sourceTextMatchedBy(FunctionExpression); // 6. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, FormalParameters, FunctionBody, non-lexical-this, funcEnv).

    const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', funcEnv); // 7. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 8. Perform MakeConstructor(closure).

    MakeConstructor(closure); // 9. Perform funcEnv.InitializeBinding(name, closure).

    funcEnv.InitializeBinding(name, closure); // 10. Return closure.

    return closure;
  }

  //   FunctionExpression :
  //     `function` `(` FormalParameters `)` `{` FunctionBody `}`

  function NamedEvaluation_FunctionExpression(FunctionExpression, name) {
    const {
      FormalParameters,
      FunctionBody
    } = FunctionExpression; // 1. Let scope be the LexicalEnvironment of the running execution context.

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let sourceText be the source text matched by FunctionExpression.

    const sourceText = sourceTextMatchedBy(FunctionExpression); // 3. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, FormalParameters, FunctionBody, non-lexical-this, scope).

    const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', scope); // 4. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 5. Perform MakeConstructor(closure).

    MakeConstructor(closure); // 6. Return closure.

    return closure;
  } // #sec-generator-function-definitions-runtime-semantics-namedevaluation
  //   GeneratorExpression :
  //     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`


  NamedEvaluation_FunctionExpression.section = 'https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-namedevaluation';

  function NamedEvaluation_GeneratorExpression(GeneratorExpression, name) {
    const {
      FormalParameters,
      GeneratorBody
    } = GeneratorExpression; // 1. Let scope be the LexicalEnvironment of the running execution context.

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let sourceText be the source text matched by GeneratorExpression.

    const sourceText = sourceTextMatchedBy(GeneratorExpression); // 3. Let closure be OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, scope).

    const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', scope); // 4. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 5. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).

    const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%')); // 6. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    })); // 7. Return closure.

    return closure;
  } // #sec-async-function-definitions-runtime-semantics-namedevaluation
  //   AsyncFunctionExpression :
  //     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`


  NamedEvaluation_GeneratorExpression.section = 'https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-namedevaluation';

  function NamedEvaluation_AsyncFunctionExpression(AsyncFunctionExpression, name) {
    const {
      FormalParameters,
      AsyncFunctionBody
    } = AsyncFunctionExpression; // 1. Let scope be the LexicalEnvironment of the running execution context.

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let sourceText be the source text matched by AsyncFunctionExpression.

    const sourceText = sourceTextMatchedBy(AsyncFunctionExpression); // 3. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, scope).

    let _temp = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope);

    Assert(!(_temp instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const closure = _temp; // 4. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 5. Return closure.

    return closure;
  } // #sec-asyncgenerator-definitions-namedevaluation
  //   AsyncGeneratorExpression :
  //     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`


  NamedEvaluation_AsyncFunctionExpression.section = 'https://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-namedevaluation';

  function NamedEvaluation_AsyncGeneratorExpression(AsyncGeneratorExpression, name) {
    const {
      FormalParameters,
      AsyncGeneratorBody
    } = AsyncGeneratorExpression; // 1. Let scope be the LexicalEnvironment of the running execution context.

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let sourceText be the source text matched by AsyncGeneratorExpression.

    const sourceText = sourceTextMatchedBy(AsyncGeneratorExpression); // 3. Let closure be OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, scope).

    const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope); // 4. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 5. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).

    const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%')); // 6. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    })); // 7. Return closure.

    return closure;
  } // #sec-arrow-function-definitions-runtime-semantics-namedevaluation
  //   ArrowFunction :
  //     ArrowParameters `=>` ConciseBody


  NamedEvaluation_AsyncGeneratorExpression.section = 'https://tc39.es/ecma262/#sec-asyncgenerator-definitions-namedevaluation';

  function NamedEvaluation_ArrowFunction(ArrowFunction, name) {
    const {
      ArrowParameters,
      ConciseBody
    } = ArrowFunction; // 1. Let scope be the LexicalEnvironment of the running execution context.

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let sourceText be the source text matched by ArrowFunction.

    const sourceText = sourceTextMatchedBy(ArrowFunction); // 3. Let parameters be CoveredFormalsList of ArrowParameters.

    const parameters = ArrowParameters; // 4. Let closure be OrdinaryFunctionCreate(%Function.prototype%, parameters, ConciseBody, lexical-this, scope).

    const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%Function.prototype%'), sourceText, parameters, ConciseBody, 'lexical-this', scope); // 5. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 6. Return closure.

    return closure;
  } // #sec-arrow-function-definitions-runtime-semantics-namedevaluation
  //   AsyncArrowFunction :
  //     ArrowParameters `=>` AsyncConciseBody


  NamedEvaluation_ArrowFunction.section = 'https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-namedevaluation';

  function NamedEvaluation_AsyncArrowFunction(AsyncArrowFunction, name) {
    const {
      ArrowParameters,
      AsyncConciseBody
    } = AsyncArrowFunction; // 1. Let scope be the LexicalEnvironment of the running execution context.

    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let sourceText be the source text matched by ArrowFunction.

    const sourceText = sourceTextMatchedBy(AsyncArrowFunction); // 3. Let head be CoveredAsyncArrowHead of CoverCallExpressionAndAsyncArrowHead.
    // 4. Let parameters be the ArrowFormalParameters of head.

    const parameters = ArrowParameters; // 5. Let closure be OrdinaryFunctionCreate(%Function.prototype%, parameters, ConciseBody, lexical-this, scope).

    const closure = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, parameters, AsyncConciseBody, 'lexical-this', scope); // 6. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 7. Return closure.

    return closure;
  } // #sec-class-definitions-runtime-semantics-namedevaluation
  //   ClassExpression : `class` ClassTail


  NamedEvaluation_AsyncArrowFunction.section = 'https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-namedevaluation';

  function* NamedEvaluation_ClassExpression(ClassExpression, name) {
    const {
      ClassTail
    } = ClassExpression; // 1. Let value be the result of ClassDefinitionEvaluation of ClassTail with arguments undefined and name.

    let value = yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, name); // 2. ReturnIfAbrupt(value).

    /* istanbul ignore if */
    if (value instanceof AbruptCompletion) {
      return value;
    }
    /* istanbul ignore if */


    if (value instanceof Completion) {
      value = value.Value;
    }

    value.SourceText = sourceTextMatchedBy(ClassExpression); // 4. Return value.

    return value;
  }

  NamedEvaluation_ClassExpression.section = 'https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-namedevaluation';
  function* NamedEvaluation(F, name) {
    switch (F.type) {
      case 'FunctionExpression':
        return NamedEvaluation_FunctionExpression(F, name);

      case 'GeneratorExpression':
        return NamedEvaluation_GeneratorExpression(F, name);

      case 'AsyncFunctionExpression':
        return NamedEvaluation_AsyncFunctionExpression(F, name);

      case 'AsyncGeneratorExpression':
        return NamedEvaluation_AsyncGeneratorExpression(F, name);

      case 'ArrowFunction':
        return NamedEvaluation_ArrowFunction(F, name);

      case 'AsyncArrowFunction':
        return NamedEvaluation_AsyncArrowFunction(F, name);

      case 'ClassExpression':
        return yield* NamedEvaluation_ClassExpression(F, name);

      case 'ParenthesizedExpression':
        return yield* NamedEvaluation(F.Expression, name);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('NamedEvaluation', F);
    }
  }

  //   TryStatement :
  //     `try` Block Catch
  //     `try` Block Finally
  //     `try` Block Catch Finally

  function Evaluate_TryStatement(TryStatement) {
    switch (true) {
      case !!TryStatement.Catch && !TryStatement.Finally:
        return Evaluate_TryStatement_BlockCatch(TryStatement);

      case !TryStatement.Catch && !!TryStatement.Finally:
        return Evaluate_TryStatement_BlockFinally(TryStatement);

      case !!TryStatement.Catch && !!TryStatement.Finally:
        return Evaluate_TryStatement_BlockCatchFinally(TryStatement);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_TryStatement', TryStatement);
    }
  } // TryStatement : `try` Block Catch

  function* Evaluate_TryStatement_BlockCatch({
    Block,
    Catch
  }) {
    // 1. Let B be the result of evaluating Block.
    const B = EnsureCompletion(yield* Evaluate(Block)); // 2. If B.[[Type]] is throw, let C be CatchClauseEvaluation of Catch with argument B.[[Value]].

    let C;

    if (B.Type === 'throw') {
      C = EnsureCompletion(yield* CatchClauseEvaluation(Catch, B.Value));
    } else {
      // 3. Else, let C be B.
      C = B;
    } // 3. Return Completion(UpdateEmpty(C, undefined)).


    return Completion(UpdateEmpty(C, Value.undefined));
  } // TryStatement : `try` Block Finally


  function* Evaluate_TryStatement_BlockFinally({
    Block,
    Finally
  }) {
    // 1. Let B be the result of evaluating Block.
    const B = EnsureCompletion(yield* Evaluate(Block)); // 1. Let F be the result of evaluating Finally.

    let F = EnsureCompletion(yield* Evaluate(Finally)); // 1. If F.[[Type]] is normal, set F to B.

    if (F.Type === 'normal') {
      F = B;
    } // 1. Return Completion(UpdateEmpty(F, undefined)).


    return Completion(UpdateEmpty(F, Value.undefined));
  } // TryStatement : `try` Block Catch Finally


  function* Evaluate_TryStatement_BlockCatchFinally({
    Block,
    Catch,
    Finally
  }) {
    // 1. Let B be the result of evaluating Block.
    const B = EnsureCompletion(yield* Evaluate(Block)); // 2. If B.[[Type]] is throw, let C be CatchClauseEvaluation of Catch with argument B.[[Value]].

    let C;

    if (B.Type === 'throw') {
      C = EnsureCompletion(yield* CatchClauseEvaluation(Catch, B.Value));
    } else {
      // 3. Else, let C be B.
      C = B;
    } // 4. Let F be the result of evaluating Finally.


    let F = EnsureCompletion(yield* Evaluate(Finally)); // 5. If F.[[Type]] is normal, set F to C.

    if (F.Type === 'normal') {
      F = C;
    } // 6. Return Completion(UpdateEmpty(F, undefined)).


    return Completion(UpdateEmpty(F, Value.undefined));
  } // #sec-runtime-semantics-catchclauseevaluation
  //  Catch :
  //    `catch` Block
  //    `catch` `(` CatchParameter `)` Block


  function* CatchClauseEvaluation({
    CatchParameter,
    Block
  }, thrownValue) {
    if (!CatchParameter) {
      // 1. Return the result of evaluating Block.
      return yield* Evaluate(Block);
    } // 1. Let oldEnv be the running execution context's LexicalEnvironment.


    const oldEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let catchEnv be NewDeclarativeEnvironment(oldEnv).

    const catchEnv = NewDeclarativeEnvironment(oldEnv); // 3. For each element argName of the BoundNames of CatchParameter, do

    for (const argName of BoundNames(CatchParameter)) {
      let _temp = catchEnv.CreateMutableBinding(argName, Value.false);

      Assert(!(_temp instanceof AbruptCompletion), "catchEnv.CreateMutableBinding(argName, Value.false)" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }
    } // 4. Set the running execution context's LexicalEnvironment to catchEnv.


    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = catchEnv; // 5. Let status be BindingInitialization of CatchParameter with arguments thrownValue and catchEnv.

    const status = yield* BindingInitialization(CatchParameter, thrownValue, catchEnv); // 6. If status is an abrupt completion, then

    if (status instanceof AbruptCompletion) {
      // a. Set the running execution context's LexicalEnvironment to oldEnv.
      exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // b. Return Completion(status).

      return Completion(status);
    } // 7. Let B be the result of evaluating Block.


    const B = EnsureCompletion(yield* Evaluate(Block)); // 8. Set the running execution context's LexicalEnvironment to oldEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // 9. Return Completion(B).

    return Completion(B);
  }

  CatchClauseEvaluation.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-catchclauseevaluation';

  function BlockDeclarationInstantiation(code, env) {
    // 1. Assert: env is a declarative Environment Record.
    Assert(env instanceof DeclarativeEnvironmentRecord, "env instanceof DeclarativeEnvironmentRecord"); // 2. Let declarations be the LexicallyScopedDeclarations of code.

    const declarations = LexicallyScopedDeclarations(code); // 3. For each element d in declarations, do

    for (const d of declarations) {
      // a. For each element dn of the BoundNames of d, do
      for (const dn of BoundNames(d)) {
        // i. If IsConstantDeclaration of d is true, then
        if (IsConstantDeclaration(d)) {
          let _temp = env.CreateImmutableBinding(dn, Value.true);

          Assert(!(_temp instanceof AbruptCompletion), "env.CreateImmutableBinding(dn, Value.true)" + ' returned an abrupt completion');
          /* istanbul ignore if */

          if (_temp instanceof Completion) {
            _temp = _temp.Value;
          }
        } else {
          let _temp2 = env.CreateMutableBinding(dn, false);

          Assert(!(_temp2 instanceof AbruptCompletion), "env.CreateMutableBinding(dn, false)" + ' returned an abrupt completion');

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }
        } // b. If d is a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration, then


        if (d.type === 'FunctionDeclaration' || d.type === 'GeneratorDeclaration' || d.type === 'AsyncFunctionDeclaration' || d.type === 'AsyncGeneratorDeclaration') {
          // i. Let fn be the sole element of the BoundNames of d.
          const fn = BoundNames(d)[0]; // ii. Let fo be InstantiateFunctionObject of d with argument env.

          const fo = InstantiateFunctionObject(d, env); // iii. Perform env.InitializeBinding(fn, fo).

          env.InitializeBinding(fn, fo);
        }
      }
    }
  } // #sec-block-runtime-semantics-evaluation
  //  Block :
  //    `{` `}`
  //    `{` StatementList `}`

  function* Evaluate_Block({
    StatementList
  }) {
    if (StatementList.length === 0) {
      // 1. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    } // 1. Let oldEnv be the running execution context's LexicalEnvironment.


    const oldEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let blockEnv be NewDeclarativeEnvironment(oldEnv).

    const blockEnv = NewDeclarativeEnvironment(oldEnv); // 3. Perform BlockDeclarationInstantiation(StatementList, blockEnv).

    BlockDeclarationInstantiation(StatementList, blockEnv); // 4. Set the running execution context's LexicalEnvironment to blockEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv; // 5. Let blockValue be the result of evaluating StatementList.

    const blockValue = yield* Evaluate_StatementList(StatementList); // 6. Set the running execution context's LexicalEnvironment to oldEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // 7. Return blockValue.

    return blockValue;
  }

  //  Elision :
  //    `,`
  //    Elision `,`
  //  ElementList :
  //    Elision? AssignmentExpression
  //    Elision? SpreadElement
  //    ElementList `,` Elision? AssignmentExpression
  //    ElementList : ElementList `,` Elision SpreadElement
  //  SpreadElement :
  //    `...` AssignmentExpression

  function* ArrayAccumulation(ElementList, array, nextIndex) {
    let postIndex = nextIndex;

    for (const element of ElementList) {
      switch (element.type) {
        case 'Elision':
          postIndex += 1;

          let _temp = Set$1(array, new Value('length'), new Value(postIndex), Value.true);
          /* istanbul ignore if */


          if (_temp instanceof AbruptCompletion) {
            return _temp;
          }
          /* istanbul ignore if */


          if (_temp instanceof Completion) {
            _temp = _temp.Value;
          }
          break;

        case 'SpreadElement':
          let _temp2 = yield* ArrayAccumulation_SpreadElement(element, array, postIndex);

          if (_temp2 instanceof AbruptCompletion) {
            return _temp2;
          }

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }

          postIndex = _temp2;
          break;

        default:
          let _temp3 = yield* ArrayAccumulation_AssignmentExpression(element, array, postIndex);

          if (_temp3 instanceof AbruptCompletion) {
            return _temp3;
          }

          if (_temp3 instanceof Completion) {
            _temp3 = _temp3.Value;
          }

          postIndex = _temp3;
          break;
      }
    }

    return postIndex;
  } // SpreadElement : `...` AssignmentExpression


  ArrayAccumulation.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-arrayaccumulation';

  function* ArrayAccumulation_SpreadElement({
    AssignmentExpression
  }, array, nextIndex) {
    // 1. Let spreadRef be the result of evaluating AssignmentExpression.
    const spreadRef = yield* Evaluate(AssignmentExpression); // 2. Let spreadObj be ? GetValue(spreadRef).

    let _temp4 = GetValue(spreadRef);

    if (_temp4 instanceof AbruptCompletion) {
      return _temp4;
    }

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    const spreadObj = _temp4; // 3. Let iteratorRecord be ? GetIterator(spreadObj).

    let _temp5 = GetIterator(spreadObj);

    if (_temp5 instanceof AbruptCompletion) {
      return _temp5;
    }

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    const iteratorRecord = _temp5; // 4. Repeat,

    while (true) {
      let _temp6 = IteratorStep(iteratorRecord);

      if (_temp6 instanceof AbruptCompletion) {
        return _temp6;
      }

      if (_temp6 instanceof Completion) {
        _temp6 = _temp6.Value;
      }

      // a. Let next be ? IteratorStep(iteratorRecord).
      const next = _temp6; // b. If next is false, return nextIndex.

      if (next === Value.false) {
        return nextIndex;
      } // c. Let nextValue be ? IteratorValue(next).


      let _temp7 = IteratorValue(next);

      if (_temp7 instanceof AbruptCompletion) {
        return _temp7;
      }

      if (_temp7 instanceof Completion) {
        _temp7 = _temp7.Value;
      }

      const nextValue = _temp7; // d. Perform ! CreateDataPropertyOrThrow(array, ! ToString(nextIndex), nextValue).

      let _temp9 = ToString(new Value(nextIndex));

      Assert(!(_temp9 instanceof AbruptCompletion), "ToString(new Value(nextIndex))" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp9 instanceof Completion) {
        _temp9 = _temp9.Value;
      }

      let _temp8 = CreateDataPropertyOrThrow(array, _temp9, nextValue);

      Assert(!(_temp8 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(array, X(ToString(new Value(nextIndex))), nextValue)" + ' returned an abrupt completion');

      if (_temp8 instanceof Completion) {
        _temp8 = _temp8.Value;
      }

      nextIndex += 1;
    }
  }

  function* ArrayAccumulation_AssignmentExpression(AssignmentExpression, array, nextIndex) {
    // 2. Let initResult be the result of evaluating AssignmentExpression.
    const initResult = yield* Evaluate(AssignmentExpression); // 3. Let initValue be ? GetValue(initResult).

    let _temp10 = GetValue(initResult);

    if (_temp10 instanceof AbruptCompletion) {
      return _temp10;
    }

    if (_temp10 instanceof Completion) {
      _temp10 = _temp10.Value;
    }

    const initValue = _temp10; // 4. Let created be ! CreateDataPropertyOrThrow(array, ! ToString(nextIndex), initValue).

    let _temp12 = ToString(new Value(nextIndex));

    Assert(!(_temp12 instanceof AbruptCompletion), "ToString(new Value(nextIndex))" + ' returned an abrupt completion');

    if (_temp12 instanceof Completion) {
      _temp12 = _temp12.Value;
    }

    let _temp11 = CreateDataPropertyOrThrow(array, _temp12, initValue);

    Assert(!(_temp11 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(array, X(ToString(new Value(nextIndex))), initValue)" + ' returned an abrupt completion');

    if (_temp11 instanceof Completion) {
      _temp11 = _temp11.Value;
    }

    return nextIndex + 1;
  } // #sec-array-initializer-runtime-semantics-evaluation
  //  ArrayLiteral :
  //    `[` Elision `]`
  //    `[` ElementList `]`
  //    `[` ElementList `,` Elision `]`


  function* Evaluate_ArrayLiteral({
    ElementList
  }) {
    let _temp13 = ArrayCreate(new Value(0));

    Assert(!(_temp13 instanceof AbruptCompletion), "ArrayCreate(new Value(0))" + ' returned an abrupt completion');

    if (_temp13 instanceof Completion) {
      _temp13 = _temp13.Value;
    }

    // 1. Let array be ! ArrayCreate(0).
    const array = _temp13; // 2. Let len be the result of performing ArrayAccumulation for ElementList with arguments array and 0.

    let len = yield* ArrayAccumulation(ElementList, array, 0); // 3. ReturnIfAbrupt(len).

    /* istanbul ignore if */
    if (len instanceof AbruptCompletion) {
      return len;
    }
    /* istanbul ignore if */


    if (len instanceof Completion) {
      len = len.Value;
    }

    return array;
  }

  //   UnaryExpression : `delete` UnaryExpression

  function* Evaluate_UnaryExpression_Delete({
    UnaryExpression
  }) {
    // 1. Let ref be the result of evaluating UnaryExpression.
    let ref = yield* Evaluate(UnaryExpression); // 2. ReturnIfAbrupt(ref).

    /* istanbul ignore if */
    if (ref instanceof AbruptCompletion) {
      return ref;
    }
    /* istanbul ignore if */


    if (ref instanceof Completion) {
      ref = ref.Value;
    }

    if (Type(ref) !== 'Reference') {
      return Value.true;
    } // 4. If IsUnresolvableReference(ref) is true, then


    if (IsUnresolvableReference(ref) === Value.true) {
      // a. Assert: IsStrictReference(ref) is false.
      Assert(IsStrictReference(ref) === Value.false, "IsStrictReference(ref) === Value.false"); // b. Return true.

      return Value.true;
    } // 5. If IsPropertyReference(ref) is true, then


    if (IsPropertyReference(ref) === Value.true) {
      // a. If IsSuperReference(ref) is true, throw a ReferenceError exception.
      if (IsSuperReference(ref) === Value.true) {
        return exports.surroundingAgent.Throw('ReferenceError', 'CannotDeleteSuper');
      } // b. Let baseObj be ! ToObject(GetBase(ref)).


      let _temp = ToObject(GetBase(ref));

      Assert(!(_temp instanceof AbruptCompletion), "ToObject(GetBase(ref))" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      const baseObj = _temp; // c. Let deleteStatus be ? baseObj.[[Delete]](GetReferencedName(ref)).

      let _temp2 = baseObj.Delete(GetReferencedName(ref));
      /* istanbul ignore if */


      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }
      /* istanbul ignore if */


      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      const deleteStatus = _temp2; // d. If deleteStatus is false and IsStrictReference(ref) is true, throw a TypeError exception.

      if (deleteStatus === Value.false && IsStrictReference(ref) === Value.true) {
        return exports.surroundingAgent.Throw('TypeError', 'StrictModeDelete', GetReferencedName(ref));
      } // e. Return deleteStatus.


      return deleteStatus;
    } else {
      // 6. Else,
      // a. Assert: ref is a Reference to an Environment Record binding.
      // b. Let bindings be GetBase(ref).
      const bindings = GetBase(ref); // c. Return ? bindings.DeleteBinding(GetReferencedName(ref)).

      return bindings.DeleteBinding(GetReferencedName(ref));
    }
  } // #sec-void-operator-runtime-semantics-evaluation
  //   UnaryExpression : `void` UnaryExpression


  Evaluate_UnaryExpression_Delete.section = 'https://tc39.es/ecma262/#sec-delete-operator-runtime-semantics-evaluation';

  function* Evaluate_UnaryExpression_Void({
    UnaryExpression
  }) {
    // 1. Let expr be the result of evaluating UnaryExpression.
    const expr = yield* Evaluate(UnaryExpression); // 2. Perform ? GetValue(expr).

    let _temp3 = GetValue(expr);

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    return Value.undefined;
  } // 12.5.5.1 #sec-typeof-operator-runtime-semantics-evaluation
  // UnaryExpression : `typeof` UnaryExpression


  Evaluate_UnaryExpression_Void.section = 'https://tc39.es/ecma262/#sec-void-operator-runtime-semantics-evaluation';

  function* Evaluate_UnaryExpression_Typeof({
    UnaryExpression
  }) {
    // 1. Let val be the result of evaluating UnaryExpression.
    let val = yield* Evaluate(UnaryExpression); // 2. If Type(val) is Reference, then

    if (Type(val) === 'Reference') {
      // a. If IsUnresolvableReference(val) is true, return "undefined".
      if (IsUnresolvableReference(val) === Value.true) {
        return new Value('undefined');
      }
    } // 3. Set val to ? GetValue(val).


    let _temp4 = GetValue(val);

    if (_temp4 instanceof AbruptCompletion) {
      return _temp4;
    }

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    val = _temp4; // 4. Return a String according to Table 37.

    const type = Type(val);

    switch (type) {
      case 'Undefined':
        return new Value('undefined');

      case 'Null':
        return new Value('object');

      case 'Boolean':
        return new Value('boolean');

      case 'Number':
        return new Value('number');

      case 'String':
        return new Value('string');

      case 'BigInt':
        return new Value('bigint');

      case 'Symbol':
        return new Value('symbol');

      case 'Object':
        if (IsCallable(val) === Value.true) {
          return new Value('function');
        }

        return new Value('object');

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_UnaryExpression_Typeof', type);
    }
  } // #sec-unary-plus-operator-runtime-semantics-evaluation
  //   UnaryExpression : `+` UnaryExpression


  Evaluate_UnaryExpression_Typeof.section = 'https://tc39.es/ecma262/#sec-typeof-operator-runtime-semantics-evaluation';

  function* Evaluate_UnaryExpression_Plus({
    UnaryExpression
  }) {
    // 1. Let expr be the result of evaluating UnaryExpression.
    const expr = yield* Evaluate(UnaryExpression); // 2. Return ? ToNumber(? GetValue(expr)).

    let _temp5 = GetValue(expr);

    if (_temp5 instanceof AbruptCompletion) {
      return _temp5;
    }

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    return ToNumber(_temp5);
  } // #sec-unary-minus-operator-runtime-semantics-evaluation
  //   UnaryExpression : `-` UnaryExpression


  Evaluate_UnaryExpression_Plus.section = 'https://tc39.es/ecma262/#sec-unary-plus-operator-runtime-semantics-evaluation';

  function* Evaluate_UnaryExpression_Minus({
    UnaryExpression
  }) {
    // 1. Let expr be the result of evaluating UnaryExpression.
    const expr = yield* Evaluate(UnaryExpression); // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).

    let _temp8 = GetValue(expr);

    if (_temp8 instanceof AbruptCompletion) {
      return _temp8;
    }

    if (_temp8 instanceof Completion) {
      _temp8 = _temp8.Value;
    }

    let _temp6 = ToNumeric(_temp8);

    if (_temp6 instanceof AbruptCompletion) {
      return _temp6;
    }

    if (_temp6 instanceof Completion) {
      _temp6 = _temp6.Value;
    }

    const oldValue = _temp6; // 3. Let T be Type(oldValue).

    const T = TypeForMethod(oldValue); // 4. Return ! T::unaryMinus(oldValue).

    let _temp7 = T.unaryMinus(oldValue);

    Assert(!(_temp7 instanceof AbruptCompletion), "T.unaryMinus(oldValue)" + ' returned an abrupt completion');

    if (_temp7 instanceof Completion) {
      _temp7 = _temp7.Value;
    }

    return _temp7;
  } // #sec-bitwise-not-operator-runtime-semantics-evaluation
  //   UnaryExpression : `~` UnaryExpression


  Evaluate_UnaryExpression_Minus.section = 'https://tc39.es/ecma262/#sec-unary-minus-operator-runtime-semantics-evaluation';

  function* Evaluate_UnaryExpression_Tilde({
    UnaryExpression
  }) {
    // 1. Let expr be the result of evaluating UnaryExpression.
    const expr = yield* Evaluate(UnaryExpression); // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).

    let _temp11 = GetValue(expr);

    if (_temp11 instanceof AbruptCompletion) {
      return _temp11;
    }

    if (_temp11 instanceof Completion) {
      _temp11 = _temp11.Value;
    }

    let _temp9 = ToNumeric(_temp11);

    if (_temp9 instanceof AbruptCompletion) {
      return _temp9;
    }

    if (_temp9 instanceof Completion) {
      _temp9 = _temp9.Value;
    }

    const oldValue = _temp9; // 3. Let T be Type(oldValue).

    const T = TypeForMethod(oldValue); // 4. Return ! T::bitwiseNOT(oldValue).

    let _temp10 = T.bitwiseNOT(oldValue);

    Assert(!(_temp10 instanceof AbruptCompletion), "T.bitwiseNOT(oldValue)" + ' returned an abrupt completion');

    if (_temp10 instanceof Completion) {
      _temp10 = _temp10.Value;
    }

    return _temp10;
  } // #sec-logical-not-operator-runtime-semantics-evaluation
  //   UnaryExpression : `!` UnaryExpression


  Evaluate_UnaryExpression_Tilde.section = 'https://tc39.es/ecma262/#sec-bitwise-not-operator-runtime-semantics-evaluation';

  function* Evaluate_UnaryExpression_Bang({
    UnaryExpression
  }) {
    // 1. Let expr be the result of evaluating UnaryExpression.
    const expr = yield* Evaluate(UnaryExpression); // 2. Let oldValue be ! ToBoolean(? GetValue(expr)).

    let _temp12 = GetValue(expr);

    if (_temp12 instanceof AbruptCompletion) {
      return _temp12;
    }

    if (_temp12 instanceof Completion) {
      _temp12 = _temp12.Value;
    }

    const oldValue = ToBoolean(_temp12); // 3. If oldValue is true, return false.

    if (oldValue === Value.true) {
      return Value.false;
    } // 4. Return true.


    return Value.true;
  } // UnaryExpression :
  //  `delete` UnaryExpression
  //  `void` UnaryExpression
  //  `typeof` UnaryExpression
  //  `+` UnaryExpression
  //  `-` UnaryExpression
  //  `~` UnaryExpression
  //  `!` UnaryExpression


  Evaluate_UnaryExpression_Bang.section = 'https://tc39.es/ecma262/#sec-logical-not-operator-runtime-semantics-evaluation';
  function* Evaluate_UnaryExpression(UnaryExpression) {
    switch (UnaryExpression.operator) {
      case 'delete':
        return yield* Evaluate_UnaryExpression_Delete(UnaryExpression);

      case 'void':
        return yield* Evaluate_UnaryExpression_Void(UnaryExpression);

      case 'typeof':
        return yield* Evaluate_UnaryExpression_Typeof(UnaryExpression);

      case '+':
        return yield* Evaluate_UnaryExpression_Plus(UnaryExpression);

      case '-':
        return yield* Evaluate_UnaryExpression_Minus(UnaryExpression);

      case '~':
        return yield* Evaluate_UnaryExpression_Tilde(UnaryExpression);

      case '!':
        return yield* Evaluate_UnaryExpression_Bang(UnaryExpression);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_UnaryExpression', UnaryExpression);
    }
  }

  //   EqualityExpression :
  //     EqualityExpression `==` RelationalExpression
  //     EqualityExpression `!=` RelationalExpression
  //     EqualityExpression `===` RelationalExpression
  //     EqualityExpression `!==` RelationalExpression

  function* Evaluate_EqualityExpression({
    EqualityExpression,
    operator,
    RelationalExpression
  }) {
    // 1. Let lref be the result of evaluating EqualityExpression.
    const lref = yield* Evaluate(EqualityExpression); // 2. Let lval be ? GetValue(lref).

    let _temp = GetValue(lref);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const lval = _temp; // 3. Let rref be the result of evaluating RelationalExpression.

    const rref = yield* Evaluate(RelationalExpression); // 4. Let rval be ? GetValue(rref).

    let _temp2 = GetValue(rref);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const rval = _temp2;

    switch (operator) {
      case '==':
        // 5. Return the result of performing Abstract Equality Comparison rval == lval.
        return AbstractEqualityComparison(rval, lval);

      case '!=':
        {
          // 5. Let r be the result of performing Abstract Equality Comparison rval == lval.
          let r = AbstractEqualityComparison(rval, lval); // 6. ReturnIfAbrupt(r).

          /* istanbul ignore if */
          if (r instanceof AbruptCompletion) {
            return r;
          }
          /* istanbul ignore if */


          if (r instanceof Completion) {
            r = r.Value;
          }

          if (r === Value.true) {
            return Value.false;
          } else {
            return Value.true;
          }
        }

      case '===':
        // 5. Return the result of performing Strict Equality Comparison rval === lval.
        return StrictEqualityComparison(rval, lval);

      case '!==':
        {
          let _temp3 = StrictEqualityComparison(rval, lval);

          Assert(!(_temp3 instanceof AbruptCompletion), "StrictEqualityComparison(rval, lval)" + ' returned an abrupt completion');
          /* istanbul ignore if */

          if (_temp3 instanceof Completion) {
            _temp3 = _temp3.Value;
          }

          // 5. Let r be the result of performing Strict Equality Comparison rval === lval.
          // 6. Assert: r is a normal completion.
          const r = _temp3; // 7. If r.[[Value]] is true, return false. Otherwise, return true.

          if (r === Value.true) {
            return Value.false;
          } else {
            return Value.true;
          }
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_EqualityExpression', operator);
    }
  }

  //   LogicalANDExpression :
  //     LogicalANDExpression `&&` BitwiseORExpression

  function* Evaluate_LogicalANDExpression({
    LogicalANDExpression,
    BitwiseORExpression
  }) {
    // 1. Let lref be the result of evaluating LogicalANDExpression.
    const lref = yield* Evaluate(LogicalANDExpression); // 2. Let lval be ? GetValue(lref).

    let _temp = GetValue(lref);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const lval = _temp; // 3. Let lbool be ! ToBoolean(lval).

    let _temp2 = ToBoolean(lval);

    Assert(!(_temp2 instanceof AbruptCompletion), "ToBoolean(lval)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const lbool = _temp2; // 4. If lbool is false, return lval.

    if (lbool === Value.false) {
      return lval;
    } // 5. Let rref be the result of evaluating BitwiseORExpression.


    const rref = yield* Evaluate(BitwiseORExpression); // 6. Return ? GetValue(rref).

    return GetValue(rref);
  }

  //   LogicalORExpression :
  //     LogicalORExpression `||` LogicalANDExpression

  function* Evaluate_LogicalORExpression({
    LogicalORExpression,
    LogicalANDExpression
  }) {
    // 1. Let lref be the result of evaluating LogicalORExpression.
    const lref = yield* Evaluate(LogicalORExpression); // 2. Let lval be ? GetValue(lref).

    let _temp = GetValue(lref);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const lval = _temp; // 3. Let lbool be ! ToBoolean(lval).

    let _temp2 = ToBoolean(lval);

    Assert(!(_temp2 instanceof AbruptCompletion), "ToBoolean(lval)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const lbool = _temp2; // 4. If lbool is false, return lval.

    if (lbool === Value.true) {
      return lval;
    } // 5. Let rref be the result of evaluating LogicalANDExpression.


    const rref = yield* Evaluate(LogicalANDExpression); // 6. Return ? GetValue(rref).

    return GetValue(rref);
  }

  function* EvaluateNew(constructExpr, args) {
    // 1. Assert: constructExpr is either a NewExpression or a MemberExpression.
    // 2. Assert: arguments is either empty or an Arguments.
    Assert(args === undefined || Array.isArray(args), "args === undefined || Array.isArray(args)"); // 3. Let ref be the result of evaluating constructExpr.

    const ref = yield* Evaluate(constructExpr); // 4. Let constructor be ? GetValue(ref).

    let _temp = GetValue(ref);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const constructor = _temp;
    let argList; // 5. If arguments is empty, let argList be a new empty List.

    if (args === undefined) {
      argList = [];
    } else {
      let _temp2 = yield* ArgumentListEvaluation(args);

      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      // 6. Else,
      // a. Let argList be ? ArgumentListEvaluation of arguments.
      argList = _temp2;
    } // 7. If IsConstructor(constructor) is false, throw a TypeError exception.


    if (IsConstructor(constructor) === Value.false) {
      return exports.surroundingAgent.Throw('TypeError', 'NotAConstructor', constructor);
    } // 8. Return ? Construct(constructor, argList).


    return Construct(constructor, argList);
  } // #sec-new-operator-runtime-semantics-evaluation
  //   NewExpression :
  //     `new` NewExpression
  //     `new` MemberExpression Arguments


  EvaluateNew.section = 'https://tc39.es/ecma262/#sec-evaluatenew';
  function* Evaluate_NewExpression({
    MemberExpression,
    Arguments
  }) {
    if (!Arguments) {
      // 1. Return ? EvaluateNew(NewExpression, empty).
      return yield* EvaluateNew(MemberExpression, undefined);
    } else {
      // 1. Return ? EvaluateNew(MemberExpression, Arguments).
      return yield* EvaluateNew(MemberExpression, Arguments);
    }
  }

  //  ShiftExpression :
  //    ShiftExpression `<<` AdditiveExpression
  // #sec-signed-right-shift-operator-runtime-semantics-evaluation
  //  ShiftExpression :
  //    ShiftExpression `>>` AdditiveExpression
  // #sec-unsigned-right-shift-operator-runtime-semantics-evaluation
  //  ShiftExpression :
  //    ShiftExpression `>>>` AdditiveExpression

  function* Evaluate_ShiftExpression({
    ShiftExpression,
    operator,
    AdditiveExpression
  }) {
    return yield* EvaluateStringOrNumericBinaryExpression(ShiftExpression, operator, AdditiveExpression);
  }

  // SuperCall : `super` Arguments

  function* Evaluate_SuperCall({
    Arguments
  }) {
    // 1. Let newTarget be GetNewTarget().
    const newTarget = GetNewTarget(); // 2. Assert: Type(newTarget) is Object.

    Assert(Type(newTarget) === 'Object', "Type(newTarget) === 'Object'"); // 3. Let func be ! GetSuperConstructor().

    let _temp = GetSuperConstructor();

    Assert(!(_temp instanceof AbruptCompletion), "GetSuperConstructor()" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const func = _temp; // 4. Let argList be ? ArgumentListEvaluation of Arguments.

    let _temp2 = yield* ArgumentListEvaluation(Arguments);
    /* istanbul ignore if */


    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }
    /* istanbul ignore if */


    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const argList = _temp2; // 5. If IsConstructor(func) is false, throw a TypeError exception.

    if (IsConstructor(func) === Value.false) {
      return exports.surroundingAgent.Throw('TypeError', 'NotAConstructor', func);
    } // 6. Let result be ? Construct(func, argList, newTarget).


    let _temp3 = Construct(func, argList, newTarget);

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const result = _temp3; // 7. Let thisER be GetThisEnvironment().

    const thisER = GetThisEnvironment(); // 8. Return ? thisER.BindThisValue(result).

    return thisER.BindThisValue(result);
  } // #sec-getsuperconstructor

  function GetSuperConstructor() {
    // 1. Let envRec be GetThisEnvironment().
    const envRec = GetThisEnvironment(); // 2. Assert: envRec is a function Environment Record.

    Assert(envRec instanceof FunctionEnvironmentRecord, "envRec instanceof FunctionEnvironmentRecord"); // 3. Let activeFunction be envRec.[[FunctionObject]].

    const activeFunction = envRec.FunctionObject; // 4. Assert: activeFunction is an ECMAScript function object.

    Assert(isECMAScriptFunctionObject(activeFunction), "isECMAScriptFunctionObject(activeFunction)"); // 5. Let superConstructor be ! activeFunction.[[GetPrototypeOf]]().

    let _temp4 = activeFunction.GetPrototypeOf();

    Assert(!(_temp4 instanceof AbruptCompletion), "activeFunction.GetPrototypeOf()" + ' returned an abrupt completion');

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    const superConstructor = _temp4; // 6. Return superConstructor.

    return superConstructor;
  }

  GetSuperConstructor.section = 'https://tc39.es/ecma262/#sec-getsuperconstructor';

  function MakeSuperPropertyReference(actualThis, propertyKey, strict) {
    // 1. Let env be GetThisEnvironment().
    const env = GetThisEnvironment(); // 2. Assert: env.HasSuperBinding() is true.

    Assert(env.HasSuperBinding() === Value.true, "env.HasSuperBinding() === Value.true"); // 3. Let baseValue be ? env.GetSuperBase().

    let _temp = env.GetSuperBase();
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const baseValue = _temp; // 4. Let bv be ? RequireObjectCoercible(baseValue).

    let _temp2 = RequireObjectCoercible(baseValue);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const bv = _temp2; // 5. Return a value of type Reference that is a Super Reference whose base value component is bv,
    //    whose referenced name component is propertyKey, whose thisValue component is actualThis, and
    //    whose strict reference flag is strict.

    return new SuperReference({
      BaseValue: bv,
      ReferencedName: propertyKey,
      thisValue: actualThis,
      StrictReference: strict ? Value.true : Value.false
    });
  } // #sec-super-keyword-runtime-semantics-evaluation
  //  SuperProperty :
  //    `super` `[` Expression `]`
  //    `super` `.` IdentifierName


  MakeSuperPropertyReference.section = 'https://tc39.es/ecma262/#sec-makesuperpropertyreference';
  function* Evaluate_SuperProperty({
    Expression,
    IdentifierName,
    strict
  }) {
    // 1. Let env be GetThisEnvironment().
    const env = GetThisEnvironment(); // 2. Let actualThis be ? env.GetThisBinding().

    let _temp3 = env.GetThisBinding();

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const actualThis = _temp3;

    if (Expression) {
      // 3. Let propertyNameReference be the result of evaluating Expression.
      const propertyNameReference = yield* Evaluate(Expression); // 4. Let propertyNameReference be the result of evaluating Expression.

      let _temp4 = GetValue(propertyNameReference);

      if (_temp4 instanceof AbruptCompletion) {
        return _temp4;
      }

      if (_temp4 instanceof Completion) {
        _temp4 = _temp4.Value;
      }

      const propertyNameValue = _temp4; // 5. Let propertyNameValue be ? GetValue(propertyNameReference).

      let _temp5 = ToPropertyKey(propertyNameValue);

      if (_temp5 instanceof AbruptCompletion) {
        return _temp5;
      }

      if (_temp5 instanceof Completion) {
        _temp5 = _temp5.Value;
      }

      const propertyKey = _temp5; // 6. If the code matched by this SuperProperty is strict mode code, let strict be true; else let strict be false.
      // 7. Return ? MakeSuperPropertyReference(actualThis, propertyKey, strict).

      return MakeSuperPropertyReference(actualThis, propertyKey, strict);
    } else {
      // 3. Let propertyKey be StringValue of IdentifierName.
      const propertyKey = StringValue(IdentifierName); // 4. const strict = SuperProperty.strict;
      // 5. Return ? MakeSuperPropertyReference(actualThis, propertyKey, strict).

      return MakeSuperPropertyReference(actualThis, propertyKey, strict);
    }
  }

  function InitializeBoundName(name, value, environment) {
    // 1. Assert: Either Type(name) is String or name is ~default~.
    Assert(name === 'default' || Type(name) === 'String', "name === 'default' || Type(name) === 'String'"); // 2. If environment is not undefined, then

    if (environment !== Value.undefined) {
      // a. Perform environment.InitializeBinding(name, value).
      environment.InitializeBinding(name, value); // b. Return NormalCompletion(undefined).

      return NormalCompletion(Value.undefined);
    } else {
      // a. Let lhs be ResolveBinding(name).
      const lhs = ResolveBinding(name, undefined, false); // b. Return ? PutValue(lhs, value).

      return PutValue(lhs, value);
    }
  } // ObjectBindingPattern :
  //   `{` `}`
  //   `{` BindingPropertyList `}`
  //   `{` BindingRestProperty `}`
  //   `{` BindingPropertyList `,` BindingRestProperty `}`

  function* BindingInitialization_ObjectBindingPattern({
    BindingPropertyList,
    BindingRestProperty
  }, value, environment) {
    let _temp = yield* PropertyBindingInitialization(BindingPropertyList, value, environment);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    // 1. Perform ? PropertyBindingInitialization for BindingPropertyList using value and environment as the arguments.
    const excludedNames = _temp;

    if (BindingRestProperty) {
      let _temp2 = RestBindingInitialization(BindingRestProperty, value, environment, excludedNames);

      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }
    } // 2. Return NormalCompletion(empty).


    return NormalCompletion(undefined);
  }

  function* BindingInitialization(node, value, environment) {
    switch (node.type) {
      case 'ForBinding':
        if (node.BindingIdentifier) {
          return yield* BindingInitialization(node.BindingIdentifier, value, environment);
        }

        return yield* BindingInitialization(node.BindingPattern, value, environment);

      case 'ForDeclaration':
        return yield* BindingInitialization(node.ForBinding, value, environment);

      case 'BindingIdentifier':
        {
          // 1. Let name be StringValue of Identifier.
          const name = StringValue(node); // 2. Return ? InitializeBoundName(name, value, environment).

          return InitializeBoundName(name, value, environment);
        }

      case 'ObjectBindingPattern':
        {
          let _temp3 = RequireObjectCoercible(value);

          if (_temp3 instanceof AbruptCompletion) {
            return _temp3;
          }

          if (_temp3 instanceof Completion) {
            _temp3 = _temp3.Value;
          }

          return yield* BindingInitialization_ObjectBindingPattern(node, value, environment);
        }

      case 'ArrayBindingPattern':
        {
          let _temp4 = GetIterator(value);

          if (_temp4 instanceof AbruptCompletion) {
            return _temp4;
          }

          if (_temp4 instanceof Completion) {
            _temp4 = _temp4.Value;
          }

          // 1. Let iteratorRecord be ? GetIterator(value).
          const iteratorRecord = _temp4; // 2. Let result be IteratorBindingInitialization of ArrayBindingPattern with arguments iteratorRecord and environment.

          const result = yield* IteratorBindingInitialization_ArrayBindingPattern(node, iteratorRecord, environment); // 3. If iteratorRecord.[[Done]] is false, return ? IteratorClose(iteratorRecord, result).

          if (iteratorRecord.Done === Value.false) {
            return IteratorClose(iteratorRecord, result);
          } // 4. Return result.


          return result;
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('BindingInitialization', node);
    }
  }

  //   AsyncFunctionExpression :
  //     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
  //     `async` `function` BindingIdentifier `(` FormalParameters `)` `{` AsyncFunctionBody `}`

  function* Evaluate_AsyncFunctionExpression(AsyncFunctionExpression) {
    const {
      BindingIdentifier,
      FormalParameters,
      AsyncFunctionBody
    } = AsyncFunctionExpression;

    if (!BindingIdentifier) {
      // 1. Return the result of performing NamedEvaluation for this AsyncFunctionExpression with argument "".
      return yield* NamedEvaluation(AsyncFunctionExpression, new Value(''));
    } // 1. Let scope be the LexicalEnvironment of the running execution context.


    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let funcEnv be ! NewDeclarativeEnvironment(scope).

    let _temp = NewDeclarativeEnvironment(scope);

    Assert(!(_temp instanceof AbruptCompletion), "NewDeclarativeEnvironment(scope)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const funcEnv = _temp; // 3. Let name be StringValue of BindingIdentifier.

    const name = StringValue(BindingIdentifier); // 4. Perform ! funcEnv.CreateImmutableBinding(name, false).

    let _temp2 = funcEnv.CreateImmutableBinding(name, Value.false);

    Assert(!(_temp2 instanceof AbruptCompletion), "funcEnv.CreateImmutableBinding(name, Value.false)" + ' returned an abrupt completion');

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const sourceText = sourceTextMatchedBy(AsyncFunctionExpression); // 6. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, funcEnv).

    let _temp3 = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', funcEnv);

    Assert(!(_temp3 instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', funcEnv)" + ' returned an abrupt completion');

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    const closure = _temp3; // 7. Perform ! SetFunctionName(closure, name).

    let _temp4 = SetFunctionName(closure, name);

    Assert(!(_temp4 instanceof AbruptCompletion), "SetFunctionName(closure, name)" + ' returned an abrupt completion');

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    let _temp5 = funcEnv.InitializeBinding(name, closure);

    Assert(!(_temp5 instanceof AbruptCompletion), "funcEnv.InitializeBinding(name, closure)" + ' returned an abrupt completion');

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    return closure;
  }

  function InstanceofOperator(V, target) {
    // 1. If Type(target) is not Object, throw a TypeError exception.
    if (Type(target) !== 'Object') {
      return exports.surroundingAgent.Throw('TypeError', 'NotAnObject', target);
    } // 2. Let instOfHandler be ? GetMethod(target, @@hasInstance).


    let _temp = GetMethod(target, wellKnownSymbols.hasInstance);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const instOfHandler = _temp; // 3. If instOfHandler is not undefined, then

    if (instOfHandler !== Value.undefined) {
      let _temp3 = Call(instOfHandler, target, [V]);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      let _temp2 = ToBoolean(_temp3);

      Assert(!(_temp2 instanceof AbruptCompletion), "ToBoolean(Q(Call(instOfHandler, target, [V])))" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      // a. Return ! ToBoolean(? Call(instOfHandler, target, « V »)).
      return _temp2;
    } // 4. If IsCallable(target) is false, throw a TypeError exception.


    if (IsCallable(target) === Value.false) {
      return exports.surroundingAgent.Throw('TypeError', 'NotAFunction', target);
    } // 5. Return ? OrdinaryHasInstance(target, V).


    return OrdinaryHasInstance(target, V);
  } // #sec-relational-operators-runtime-semantics-evaluation
  //   RelationalExpression :
  //     RelationalExpression `<` ShiftExpression
  //     RelationalExpression `>` ShiftExpression
  //     RelationalExpression `<=` ShiftExpression
  //     RelationalExpression `>=` ShiftExpression
  //     RelationalExpression `instanceof` ShiftExpression
  //     RelationalExpression `in` ShiftExpression

  function* Evaluate_RelationalExpression({
    RelationalExpression,
    operator,
    ShiftExpression
  }) {
    // 1. Let lref be the result of evaluating RelationalExpression.
    const lref = yield* Evaluate(RelationalExpression); // 2. Let lval be ? GetValue(lref).

    let _temp4 = GetValue(lref);

    if (_temp4 instanceof AbruptCompletion) {
      return _temp4;
    }

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    const lval = _temp4; // 3. Let rref be the result of evaluating ShiftExpression.

    const rref = yield* Evaluate(ShiftExpression); // 4. Let rval be ? GetValue(rref).

    let _temp5 = GetValue(rref);

    if (_temp5 instanceof AbruptCompletion) {
      return _temp5;
    }

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    const rval = _temp5;

    switch (operator) {
      case '<':
        {
          // 5. Let r be the result of performing Abstract Relational Comparison lval < rval.
          let r = AbstractRelationalComparison(lval, rval); // 6. ReturnIfAbrupt(r).

          /* istanbul ignore if */
          if (r instanceof AbruptCompletion) {
            return r;
          }
          /* istanbul ignore if */


          if (r instanceof Completion) {
            r = r.Value;
          }

          if (r === Value.undefined) {
            return Value.false;
          }

          return r;
        }

      case '>':
        {
          // 5. Let r be the result of performing Abstract Relational Comparison rval < lval with LeftFirst equal to false.
          let r = AbstractRelationalComparison(rval, lval, false); // 6. ReturnIfAbrupt(r).

          if (r instanceof AbruptCompletion) {
            return r;
          }

          if (r instanceof Completion) {
            r = r.Value;
          }

          if (r === Value.undefined) {
            return Value.false;
          }

          return r;
        }

      case '<=':
        {
          // 5. Let r be the result of performing Abstract Relational Comparison rval < lval with LeftFirst equal to false.
          let r = AbstractRelationalComparison(rval, lval, false); // 6. ReturnIfAbrupt(r).

          if (r instanceof AbruptCompletion) {
            return r;
          }

          if (r instanceof Completion) {
            r = r.Value;
          }

          if (r === Value.true || r === Value.undefined) {
            return Value.false;
          }

          return Value.true;
        }

      case '>=':
        {
          // 5. Let r be the result of performing Abstract Relational Comparison lval < rval.
          let r = AbstractRelationalComparison(lval, rval); // 6. ReturnIfAbrupt(r).

          if (r instanceof AbruptCompletion) {
            return r;
          }

          if (r instanceof Completion) {
            r = r.Value;
          }

          if (r === Value.true || r === Value.undefined) {
            return Value.false;
          }

          return Value.true;
        }

      case 'instanceof':
        // 5. Return ? InstanceofOperator(lval, rval).
        return InstanceofOperator(lval, rval);

      case 'in':
        // 5. Return ? InstanceofOperator(lval, rval).
        if (Type(rval) !== 'Object') {
          return exports.surroundingAgent.Throw('TypeError', 'NotAnObject', rval);
        } // 6. Return ? HasProperty(rval, ? ToPropertyKey(lval)).


        return HasProperty(rval, ToPropertyKey(lval));

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('Evaluate_RelationalExpression', operator);
    }
  }

  //   BreakableStatement :
  //     IterationStatement
  //     SwitchStatement
  //
  //   IterationStatement :
  //     (DoStatement)
  //     (WhileStatement)

  function Evaluate_BreakableStatement(BreakableStatement) {
    // 1. Let newLabelSet be a new empty List.
    const newLabelSet = new ValueSet(); // 2. Return the result of performing LabelledEvaluation of this BreakableStatement with argument newLabelSet.

    return LabelledEvaluation(BreakableStatement, newLabelSet);
  }

  function assignProps(realmRec, obj, props) {
    for (const item of props) {
      if (item === undefined) {
        continue;
      }

      const [n, v, len, descriptor] = item;
      const name = n instanceof Value ? n : new Value(n);

      if (Array.isArray(v)) {
        // Every accessor property described in clauses 18 through 26 and in
        // Annex B.2 has the attributes { [[Enumerable]]: false,
        // [[Configurable]]: true } unless otherwise specified. If only a get
        // accessor function is described, the set accessor function is the
        // default value, undefined. If only a set accessor is described the get
        // accessor is the default value, undefined.
        let [getter = Value.undefined, setter = Value.undefined] = v;

        if (typeof getter === 'function') {
          getter = CreateBuiltinFunction(getter, [], realmRec);

          let _temp = SetFunctionName(getter, name, new Value('get'));

          Assert(!(_temp instanceof AbruptCompletion), "SetFunctionName(getter, name, new Value('get'))" + ' returned an abrupt completion');
          /* istanbul ignore if */

          if (_temp instanceof Completion) {
            _temp = _temp.Value;
          }

          let _temp2 = SetFunctionLength(getter, new Value(0));

          Assert(!(_temp2 instanceof AbruptCompletion), "SetFunctionLength(getter, new Value(0))" + ' returned an abrupt completion');

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }
        }

        if (typeof setter === 'function') {
          setter = CreateBuiltinFunction(setter, [], realmRec);

          let _temp3 = SetFunctionName(setter, name, new Value('set'));

          Assert(!(_temp3 instanceof AbruptCompletion), "SetFunctionName(setter, name, new Value('set'))" + ' returned an abrupt completion');

          if (_temp3 instanceof Completion) {
            _temp3 = _temp3.Value;
          }

          let _temp4 = SetFunctionLength(setter, new Value(1));

          Assert(!(_temp4 instanceof AbruptCompletion), "SetFunctionLength(setter, new Value(1))" + ' returned an abrupt completion');

          if (_temp4 instanceof Completion) {
            _temp4 = _temp4.Value;
          }
        }

        let _temp5 = obj.DefineOwnProperty(name, Descriptor({
          Get: getter,
          Set: setter,
          Enumerable: Value.false,
          Configurable: Value.true,
          ...descriptor
        }));

        Assert(!(_temp5 instanceof AbruptCompletion), "obj.DefineOwnProperty(name, Descriptor({\n        Get: getter,\n        Set: setter,\n        Enumerable: Value.false,\n        Configurable: Value.true,\n        ...descriptor,\n      }))" + ' returned an abrupt completion');

        if (_temp5 instanceof Completion) {
          _temp5 = _temp5.Value;
        }
      } else {
        // Every other data property described in clauses 18 through 26 and in
        // Annex B.2 has the attributes { [[Writable]]: true, [[Enumerable]]:
        // false, [[Configurable]]: true } unless otherwise specified.
        let value;

        if (typeof v === 'function') {
          Assert(typeof len === 'number', "typeof len === 'number'");
          value = CreateBuiltinFunction(v, [], realmRec);

          let _temp6 = SetFunctionName(value, name);

          Assert(!(_temp6 instanceof AbruptCompletion), "SetFunctionName(value, name)" + ' returned an abrupt completion');

          if (_temp6 instanceof Completion) {
            _temp6 = _temp6.Value;
          }

          let _temp7 = SetFunctionLength(value, new Value(len));

          Assert(!(_temp7 instanceof AbruptCompletion), "SetFunctionLength(value, new Value(len))" + ' returned an abrupt completion');

          if (_temp7 instanceof Completion) {
            _temp7 = _temp7.Value;
          }
        } else {
          value = v;
        }

        obj.properties.set(name, Descriptor({
          Value: value,
          Writable: Value.true,
          Enumerable: Value.false,
          Configurable: Value.true,
          ...descriptor
        }));
      }
    }
  }
  function bootstrapPrototype(realmRec, props, Prototype, stringTag) {
    Assert(Prototype !== undefined, "Prototype !== undefined");
    const proto = OrdinaryObjectCreate(Prototype);
    assignProps(realmRec, proto, props);

    if (stringTag !== undefined) {
      let _temp8 = proto.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
        Value: new Value(stringTag),
        Writable: Value.false,
        Enumerable: Value.false,
        Configurable: Value.true
      }));

      Assert(!(_temp8 instanceof AbruptCompletion), "proto.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({\n      Value: new Value(stringTag),\n      Writable: Value.false,\n      Enumerable: Value.false,\n      Configurable: Value.true,\n    }))" + ' returned an abrupt completion');

      if (_temp8 instanceof Completion) {
        _temp8 = _temp8.Value;
      }
    }

    return proto;
  }
  function bootstrapConstructor(realmRec, Constructor, name, length, Prototype, props = []) {
    const cons = CreateBuiltinFunction(Constructor, [], realmRec, undefined, Value.true);
    SetFunctionName(cons, new Value(name));
    SetFunctionLength(cons, new Value(length));

    let _temp9 = cons.DefineOwnProperty(new Value('prototype'), Descriptor({
      Value: Prototype,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false
    }));

    Assert(!(_temp9 instanceof AbruptCompletion), "cons.DefineOwnProperty(new Value('prototype'), Descriptor({\n    Value: Prototype,\n    Writable: Value.false,\n    Enumerable: Value.false,\n    Configurable: Value.false,\n  }))" + ' returned an abrupt completion');

    if (_temp9 instanceof Completion) {
      _temp9 = _temp9.Value;
    }

    let _temp10 = Prototype.DefineOwnProperty(new Value('constructor'), Descriptor({
      Value: cons,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true
    }));

    Assert(!(_temp10 instanceof AbruptCompletion), "Prototype.DefineOwnProperty(new Value('constructor'), Descriptor({\n    Value: cons,\n    Writable: Value.true,\n    Enumerable: Value.false,\n    Configurable: Value.true,\n  }))" + ' returned an abrupt completion');

    if (_temp10 instanceof Completion) {
      _temp10 = _temp10.Value;
    }
    assignProps(realmRec, cons, props);
    return cons;
  }

  function CreateForInIterator(object) {
    // 1. Assert: Type(object) is Object.
    Assert(Type(object) === 'Object', "Type(object) === 'Object'"); // 2. Let iterator be ObjectCreate(%ForInIteratorPrototype%, « [[Object]], [[ObjectWasVisited]], [[VisitedKeys]], [[RemainingKeys]] »).

    const iterator = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%ForInIteratorPrototype%'), ['Object', 'ObjectWasVisited', 'VisitedKeys', 'RemainingKeys']); // 3. Set iterator.[[Object]] to object.

    iterator.Object = object; // 4. Set iterator.[[ObjectWasVisited]] to false.

    iterator.ObjectWasVisited = Value.false; // 5. Set iterator.[[VisitedKeys]] to a new empty List.

    iterator.VisitedKeys = []; // 6. Set iterator.[[RemainingKeys]] to a new empty List.

    iterator.RemainingKeys = []; // 7. Return iterator.

    return iterator;
  } // #sec-%foriniteratorprototype%.next

  function ForInIteratorPrototype_next(args, {
    thisValue
  }) {
    // 1. Let O be this value.
    const O = thisValue; // 2. Assert: Type(O) is Object.

    Assert(Type(O) === 'Object', "Type(O) === 'Object'"); // 3. Assert: O has all the internal slot sof a For-In Iterator Instance.

    Assert('Object' in O && 'ObjectWasVisited' in O && 'VisitedKeys' in O && 'RemainingKeys in O', "'Object' in O && 'ObjectWasVisited' in O && 'VisitedKeys' in O && 'RemainingKeys in O'"); // 4. Let object be O.[[Object]].

    let object = O.Object; // 5. Let visited be O.[[VisitedKeys]].

    const visited = O.VisitedKeys; // 6. Let remaining be O.[[RemainingKeys]].

    const remaining = O.RemainingKeys; // 7. Repeat,

    while (true) {
      // a. If O.[[ObjectWasVisited]] is false, then
      if (O.ObjectWasVisited === Value.false) {
        let _temp = object.OwnPropertyKeys();
        /* istanbul ignore if */


        if (_temp instanceof AbruptCompletion) {
          return _temp;
        }
        /* istanbul ignore if */


        if (_temp instanceof Completion) {
          _temp = _temp.Value;
        }

        // i. Let keys be ? object.[[OwnPropertyKeys]]().
        const keys = _temp; // ii. for each key of keys in List order, do

        for (const key of keys) {
          // 1. If Type(key) is String, then
          if (Type(key) === 'String') {
            // a. Append key to remaining.
            remaining.push(key);
          }
        } // iii. Set O.ObjectWasVisited to true.


        O.ObjectWasVisited = Value.true;
      } // b. Repeat, while remaining is not empty,


      while (remaining.length > 0) {
        // i. Remove the first element from remaining and let r be the value of the element.
        const r = remaining.shift(); // ii. If there does not exist an element v of visisted such that SameValue(r, v) is true, then

        if (!visited.find(v => SameValue(r, v) === Value.true)) {
          let _temp2 = object.GetOwnProperty(r);

          if (_temp2 instanceof AbruptCompletion) {
            return _temp2;
          }

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }

          // 1. Let desc be ? object.[[GetOwnProperty]](r).
          const desc = _temp2; // 2. If desc is not undefined, then,

          if (desc !== Value.undefined) {
            // a. Append r to visited.
            visited.push(r); // b. If desc.[[Enumerable]] is true, return CreateIterResultObject(r, false).

            if (desc.Enumerable === Value.true) {
              return CreateIterResultObject(r, Value.false);
            }
          }
        }
      } // c. Set object to ? object.[[GetPrototypeOf]]().


      let _temp3 = object.GetPrototypeOf();

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      object = _temp3; // d. Set O.Object to object.

      O.Object = object; // e. Set O.ObjectWasVisited to false.

      O.ObjectWasVisited = Value.false; // f. If object is null, return CreateIterResultObject(undefined, true).

      if (object === Value.null) {
        return CreateIterResultObject(Value.undefined, Value.true);
      }
    }
  }

  ForInIteratorPrototype_next.section = 'https://tc39.es/ecma262/#sec-%foriniteratorprototype%.next';
  function BootstrapForInIteratorPrototype(realmRec) {
    const proto = bootstrapPrototype(realmRec, [['next', ForInIteratorPrototype_next, 0]], realmRec.Intrinsics['%IteratorPrototype%']);
    realmRec.Intrinsics['%ForInIteratorPrototype%'] = proto;
  }

  function LoopContinues(completion, labelSet) {
    // 1. If completion.[[Type]] is normal, return true.
    if (completion.Type === 'normal') {
      return Value.true;
    } // 2. If completion.[[Type]] is not continue, return false.


    if (completion.Type !== 'continue') {
      return Value.false;
    } // 3. If completion.[[Target]] is empty, return true.


    if (completion.Target === undefined) {
      return Value.true;
    } // 4. If completion.[[Target]] is an element of labelSet, return true.


    if (labelSet.has(completion.Target)) {
      return Value.true;
    } // 5. Return false.


    return Value.false;
  }

  LoopContinues.section = 'https://tc39.es/ecma262/#sec-loopcontinues';
  function LabelledEvaluation(node, labelSet) {
    switch (node.type) {
      case 'DoWhileStatement':
      case 'WhileStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'ForAwaitStatement':
      case 'SwitchStatement':
        return LabelledEvaluation_BreakableStatement(node, labelSet);

      case 'LabelledStatement':
        return LabelledEvaluation_LabelledStatement(node, labelSet);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('LabelledEvaluation', node);
    }
  } // #sec-labelled-statements-runtime-semantics-labelledevaluation
  //   LabelledStatement : LabelIdentifier `:` LabelledItem

  function* LabelledEvaluation_LabelledStatement({
    LabelIdentifier,
    LabelledItem
  }, labelSet) {
    // 1. Let label be the StringValue of LabelIdentifier.
    const label = StringValue(LabelIdentifier); // 2. Append label as an element of labelSet.

    labelSet.add(label); // 3. Let stmtResult be LabelledEvaluation of LabelledItem with argument labelSet.

    let stmtResult = EnsureCompletion(yield* LabelledEvaluation_LabelledItem(LabelledItem, labelSet)); // 4. If stmtResult.[[Type]] is break and SameValue(stmtResult.[[Target]], label) is true, then

    if (stmtResult.Type === 'break' && SameValue(stmtResult.Target, label) === Value.true) {
      // a. Set stmtResult to NormalCompletion(stmtResult.[[Value]]).
      stmtResult = NormalCompletion(stmtResult.Value);
    } // 5. Return Completion(stmtResult).


    return Completion(stmtResult);
  } // LabelledItem :
  //   Statement
  //   FunctionDeclaration


  LabelledEvaluation_LabelledStatement.section = 'https://tc39.es/ecma262/#sec-labelled-statements-runtime-semantics-labelledevaluation';

  function LabelledEvaluation_LabelledItem(LabelledItem, labelSet) {
    switch (LabelledItem.type) {
      case 'DoWhileStatement':
      case 'WhileStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'SwitchStatement':
      case 'LabelledStatement':
        return LabelledEvaluation(LabelledItem, labelSet);

      default:
        return Evaluate(LabelledItem);
    }
  } // #sec-statement-semantics-runtime-semantics-labelledevaluation
  //  BreakableStatement :
  //    IterationStatement
  //    SwitchStatement
  //
  //  IterationStatement :
  //    (DoWhileStatement)
  //    (WhileStatement)


  function* LabelledEvaluation_BreakableStatement(BreakableStatement, labelSet) {
    switch (BreakableStatement.type) {
      case 'DoWhileStatement':
      case 'WhileStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'ForAwaitStatement':
        {
          // 1. Let stmtResult be LabelledEvaluation of IterationStatement with argument labelSet.
          let stmtResult = EnsureCompletion(yield* LabelledEvaluation_IterationStatement(BreakableStatement, labelSet)); // 2. If stmtResult.[[Type]] is break, then

          if (stmtResult.Type === 'break') {
            // a. If stmtResult.[[Target]] is empty, then
            if (stmtResult.Target === undefined) {
              // i. If stmtResult.[[Value]] is empty, set stmtResult to NormalCompletion(undefined).
              if (stmtResult.Value === undefined) {
                stmtResult = NormalCompletion(Value.undefined);
              } else {
                // ii. Else, set stmtResult to NormalCompletion(stmtResult.[[Value]]).
                stmtResult = NormalCompletion(stmtResult.Value);
              }
            }
          } // 3. Return Completion(stmtResult).


          return Completion(stmtResult);
        }

      case 'SwitchStatement':
        {
          // 1. Let stmtResult be LabelledEvaluation of SwitchStatement.
          let stmtResult = EnsureCompletion(yield* Evaluate_SwitchStatement(BreakableStatement)); // 2. If stmtResult.[[Type]] is break, then

          if (stmtResult.Type === 'break') {
            // a. If stmtResult.[[Target]] is empty, then
            if (stmtResult.Target === undefined) {
              // i. If stmtResult.[[Value]] is empty, set stmtResult to NormalCompletion(undefined).
              if (stmtResult.Value === undefined) {
                stmtResult = NormalCompletion(Value.undefined);
              } else {
                // ii. Else, set stmtResult to NormalCompletion(stmtResult.[[Value]]).
                stmtResult = NormalCompletion(stmtResult.Value);
              }
            }
          } // 3. Return Completion(stmtResult).


          return Completion(stmtResult);
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('LabelledEvaluation_BreakableStatement', BreakableStatement);
    }
  }

  LabelledEvaluation_BreakableStatement.section = 'https://tc39.es/ecma262/#sec-statement-semantics-runtime-semantics-labelledevaluation';

  function LabelledEvaluation_IterationStatement(IterationStatement, labelSet) {
    switch (IterationStatement.type) {
      case 'DoWhileStatement':
        return LabelledEvaluation_IterationStatement_DoWhileStatement(IterationStatement, labelSet);

      case 'WhileStatement':
        return LabelledEvaluation_IterationStatement_WhileStatement(IterationStatement, labelSet);

      case 'ForStatement':
        return LabelledEvaluation_BreakableStatement_ForStatement(IterationStatement, labelSet);

      case 'ForInStatement':
        return LabelledEvaluation_IterationStatement_ForInStatement(IterationStatement, labelSet);

      case 'ForOfStatement':
        return LabelledEvaluation_IterationStatement_ForOfStatement(IterationStatement, labelSet);

      case 'ForAwaitStatement':
        return LabelledEvaluation_IterationStatement_ForAwaitStatement(IterationStatement, labelSet);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('LabelledEvaluation_IterationStatement', IterationStatement);
    }
  } // #sec-do-while-statement-runtime-semantics-labelledevaluation
  //   IterationStatement :
  //     `do` Statement `while` `(` Expression `)` `;`


  function* LabelledEvaluation_IterationStatement_DoWhileStatement({
    Statement,
    Expression
  }, labelSet) {
    // 1. Let V be undefined.
    let V = Value.undefined; // 2. Repeat,

    while (true) {
      // a. Let stmtResult be the result of evaluating Statement.
      const stmtResult = EnsureCompletion(yield* Evaluate(Statement)); // b. If LoopContinues(stmtResult, labelSet) is false, return Completion(UpdateEmpty(stmtResult, V)).

      if (LoopContinues(stmtResult, labelSet) === Value.false) {
        return Completion(UpdateEmpty(stmtResult, V));
      } // c. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].


      if (stmtResult.Value !== undefined) {
        V = stmtResult.Value;
      } // d. Let exprRef be the result of evaluating Expression.


      const exprRef = yield* Evaluate(Expression); // e. Let exprValue be ? GetValue(exprRef).

      let _temp = GetValue(exprRef);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      const exprValue = _temp; // f. If ! ToBoolean(exprValue) is false, return NormalCompletion(V).

      let _temp2 = ToBoolean(exprValue);

      Assert(!(_temp2 instanceof AbruptCompletion), "ToBoolean(exprValue)" + ' returned an abrupt completion');
      /* istanbul ignore if */

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      if (_temp2 === Value.false) {
        return NormalCompletion(V);
      }
    }
  } // #sec-while-statement-runtime-semantics-labelledevaluation
  //   IterationStatement :
  //     `while` `(` Expression `)` Statement


  LabelledEvaluation_IterationStatement_DoWhileStatement.section = 'https://tc39.es/ecma262/#sec-do-while-statement-runtime-semantics-labelledevaluation';

  function* LabelledEvaluation_IterationStatement_WhileStatement({
    Expression,
    Statement
  }, labelSet) {
    // 1. Let V be undefined.
    let V = Value.undefined; // 2. Repeat,

    while (true) {
      // a. Let exprRef be the result of evaluating Expression.
      const exprRef = yield* Evaluate(Expression); // b. Let exprValue be ? GetValue(exprRef).

      let _temp3 = GetValue(exprRef);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      const exprValue = _temp3; // c. If ! ToBoolean(exprValue) is false, return NormalCompletion(V).

      let _temp4 = ToBoolean(exprValue);

      Assert(!(_temp4 instanceof AbruptCompletion), "ToBoolean(exprValue)" + ' returned an abrupt completion');

      if (_temp4 instanceof Completion) {
        _temp4 = _temp4.Value;
      }

      if (_temp4 === Value.false) {
        return NormalCompletion(V);
      } // d. Let stmtResult be the result of evaluating Statement.


      const stmtResult = EnsureCompletion(yield* Evaluate(Statement)); // e. If LoopContinues(stmtResult, labelSet) is false, return Completion(UpdateEmpty(stmtResult, V)).

      if (LoopContinues(stmtResult, labelSet) === Value.false) {
        return Completion(UpdateEmpty(stmtResult, V));
      } // f. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].


      if (stmtResult.Value !== undefined) {
        V = stmtResult.Value;
      }
    }
  } // #sec-for-statement-runtime-semantics-labelledevaluation
  //   IterationStatement :
  //     `for` `(` Expression? `;` Expression? `;` Expresssion? `)` Statement
  //     `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
  //     `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement


  LabelledEvaluation_IterationStatement_WhileStatement.section = 'https://tc39.es/ecma262/#sec-while-statement-runtime-semantics-labelledevaluation';

  function* LabelledEvaluation_BreakableStatement_ForStatement(ForStatement, labelSet) {
    const {
      VariableDeclarationList,
      LexicalDeclaration,
      Expression_a,
      Expression_b,
      Expression_c,
      Statement
    } = ForStatement;

    switch (true) {
      case !!LexicalDeclaration:
        {
          // 1. Let oldEnv be the running execution context's LexicalEnvironment.
          const oldEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let loopEnv be NewDeclarativeEnvironment(oldEnv).

          const loopEnv = NewDeclarativeEnvironment(oldEnv); // 3. Let isConst be IsConstantDeclaration of LexicalDeclaration.

          const isConst = IsConstantDeclaration(LexicalDeclaration); // 4. Let boundNames be the BoundNames of LexicalDeclaration.

          const boundNames = BoundNames(LexicalDeclaration); // 5. For each element dn of boundNames, do

          for (const dn of boundNames) {
            // a. If isConst is true, then
            if (isConst) {
              let _temp5 = loopEnv.CreateImmutableBinding(dn, Value.true);

              Assert(!(_temp5 instanceof AbruptCompletion), "loopEnv.CreateImmutableBinding(dn, Value.true)" + ' returned an abrupt completion');

              if (_temp5 instanceof Completion) {
                _temp5 = _temp5.Value;
              }
            } else {
              let _temp6 = loopEnv.CreateMutableBinding(dn, Value.false);

              Assert(!(_temp6 instanceof AbruptCompletion), "loopEnv.CreateMutableBinding(dn, Value.false)" + ' returned an abrupt completion');

              if (_temp6 instanceof Completion) {
                _temp6 = _temp6.Value;
              }
            }
          } // 6. Set the running execution context's LexicalEnvironment to loopEnv.


          exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = loopEnv; // 7. Let forDcl be the result of evaluating LexicalDeclaration.

          const forDcl = yield* Evaluate(LexicalDeclaration); // 8. If forDcl is an abrupt completion, then

          if (forDcl instanceof AbruptCompletion) {
            // a. Set the running execution context's LexicalEnvironment to oldEnv.
            exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // b. Return Completion(forDcl).

            return Completion(forDcl);
          } // 9. If isConst is false, let perIterationLets be boundNames; otherwise let perIterationLets be « ».


          let perIterationLets;

          if (isConst === false) {
            perIterationLets = boundNames;
          } else {
            perIterationLets = [];
          } // 10. Let bodyResult be ForBodyEvaluation(the first Expression, the second Expression, Statement, perIterationLets, labelSet).


          const bodyResult = yield* ForBodyEvaluation(Expression_a, Expression_b, Statement, perIterationLets, labelSet); // 11. Set the running execution context's LexicalEnvironment to oldEnv.

          exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // 12. Return Completion(bodyResult).

          return Completion(bodyResult);
        }

      case !!VariableDeclarationList:
        {
          // 1. Let varDcl be the result of evaluating VariableDeclarationList.
          let varDcl = yield* Evaluate_VariableDeclarationList(VariableDeclarationList); // 2. ReturnIfAbrupt(varDcl).

          /* istanbul ignore if */
          if (varDcl instanceof AbruptCompletion) {
            return varDcl;
          }
          /* istanbul ignore if */


          if (varDcl instanceof Completion) {
            varDcl = varDcl.Value;
          }

          return yield* ForBodyEvaluation(Expression_a, Expression_b, Statement, [], labelSet);
        }

      default:
        {
          // 1. If the first Expression is present, then
          if (Expression_a) {
            // a. Let exprRef be the result of evaluating the first Expression.
            const exprRef = yield* Evaluate(Expression_a); // b. Perform ? GetValue(exprRef).

            let _temp7 = GetValue(exprRef);

            if (_temp7 instanceof AbruptCompletion) {
              return _temp7;
            }

            if (_temp7 instanceof Completion) {
              _temp7 = _temp7.Value;
            }
          } // 2. Return ? ForBodyEvaluation(the second Expression, the third Expression, Statement, « », labelSet).


          return yield* ForBodyEvaluation(Expression_b, Expression_c, Statement, [], labelSet);
        }
    }
  }

  LabelledEvaluation_BreakableStatement_ForStatement.section = 'https://tc39.es/ecma262/#sec-for-statement-runtime-semantics-labelledevaluation';

  function* LabelledEvaluation_IterationStatement_ForInStatement(ForInStatement, labelSet) {
    const {
      LeftHandSideExpression,
      ForBinding,
      ForDeclaration,
      Expression,
      Statement
    } = ForInStatement;

    switch (true) {
      case !!LeftHandSideExpression && !!Expression:
        {
          let _temp8 = yield* ForInOfHeadEvaluation([], Expression, 'enumerate');

          if (_temp8 instanceof AbruptCompletion) {
            return _temp8;
          }

          if (_temp8 instanceof Completion) {
            _temp8 = _temp8.Value;
          }

          // IterationStatement : `for` `(` LeftHandSideExpression `in` Expression `)` Statement
          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », Expression, enumerate).
          const keyResult = _temp8; // 2. Return ? ForIn/OfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, enumerate, assignment, labelSet).

          return yield* ForInOfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, 'enumerate', 'assignment', labelSet);
        }

      case !!ForBinding && !!Expression:
        {
          let _temp9 = yield* ForInOfHeadEvaluation([], Expression, 'enumerate');

          if (_temp9 instanceof AbruptCompletion) {
            return _temp9;
          }

          if (_temp9 instanceof Completion) {
            _temp9 = _temp9.Value;
          }

          // IterationStatement :`for` `(` `var` ForBinding `in` Expression `)` Statement
          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », Expression, enumerate).
          const keyResult = _temp9; // 2. Return ? ForIn/OfBodyEvaluation(ForBinding, Statement, keyResult, enumerate, varBinding, labelSet).

          return yield* ForInOfBodyEvaluation(ForBinding, Statement, keyResult, 'enumerate', 'varBinding', labelSet);
        }

      case !!ForDeclaration && !!Expression:
        {
          let _temp10 = yield* ForInOfHeadEvaluation(BoundNames(ForDeclaration), Expression, 'enumerate');

          if (_temp10 instanceof AbruptCompletion) {
            return _temp10;
          }

          if (_temp10 instanceof Completion) {
            _temp10 = _temp10.Value;
          }

          // IterationStatement : `for` `(` ForDeclaration `in` Expression `)` Statement
          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(BoundNames of ForDeclaration, Expression, enumerate).
          const keyResult = _temp10; // 2. Return ? ForIn/OfBodyEvaluation(ForDeclaration, Statement, keyResult, enumerate, lexicalBinding, labelSet).

          return yield* ForInOfBodyEvaluation(ForDeclaration, Statement, keyResult, 'enumerate', 'lexicalBinding', labelSet);
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('LabelledEvaluation_IterationStatement_ForInStatement', ForInStatement);
    }
  } // IterationStatement :
  //   `for` `await` `(` LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` ForDeclaration`of` AssignmentExpression `)` Statement


  function* LabelledEvaluation_IterationStatement_ForAwaitStatement(ForAwaitStatement, labelSet) {
    const {
      LeftHandSideExpression,
      ForBinding,
      ForDeclaration,
      AssignmentExpression,
      Statement
    } = ForAwaitStatement;

    switch (true) {
      case !!LeftHandSideExpression:
        {
          let _temp11 = yield* ForInOfHeadEvaluation([], AssignmentExpression, 'async-iterate');

          if (_temp11 instanceof AbruptCompletion) {
            return _temp11;
          }

          if (_temp11 instanceof Completion) {
            _temp11 = _temp11.Value;
          }

          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », AssignmentExpression, async-iterate).
          const keyResult = _temp11; // 2. Return ? ForIn/OfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, iterate, assignment, labelSet, async).

          return yield* ForInOfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, 'iterate', 'assignment', labelSet, 'async');
        }

      case !!ForBinding:
        {
          let _temp12 = yield* ForInOfHeadEvaluation([], AssignmentExpression, 'async-iterate');

          if (_temp12 instanceof AbruptCompletion) {
            return _temp12;
          }

          if (_temp12 instanceof Completion) {
            _temp12 = _temp12.Value;
          }

          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », AssignmentExpression, async-iterate).
          const keyResult = _temp12; // 2. Return ? ForIn/OfBodyEvaluation(ForBinding, Statement, keyResult, iterate, varBinding, labelSet, async).

          return yield* ForInOfBodyEvaluation(ForBinding, Statement, keyResult, 'iterate', 'varBinding', labelSet, 'async');
        }

      case !!ForDeclaration:
        {
          let _temp13 = yield* ForInOfHeadEvaluation(BoundNames(ForDeclaration), AssignmentExpression, 'async-iterate');

          if (_temp13 instanceof AbruptCompletion) {
            return _temp13;
          }

          if (_temp13 instanceof Completion) {
            _temp13 = _temp13.Value;
          }

          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(BoundNames of ForDeclaration, AssignmentExpression, async-iterate).
          const keyResult = _temp13; // 2. Return ? ForIn/OfBodyEvaluation(ForDeclaration, Statement, keyResult, iterate, lexicalBinding, labelSet, async).

          return yield* ForInOfBodyEvaluation(ForDeclaration, Statement, keyResult, 'iterate', 'lexicalBinding', labelSet, 'async');
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('LabelledEvaluation_IterationStatement_ForAwaitStatement', ForAwaitStatement);
    }
  } // #sec-for-in-and-for-of-statements-runtime-semantics-labelledevaluation
  // IterationStatement :
  //   `for` `(` LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement


  function* LabelledEvaluation_IterationStatement_ForOfStatement(ForOfStatement, labelSet) {
    const {
      LeftHandSideExpression,
      ForBinding,
      ForDeclaration,
      AssignmentExpression,
      Statement
    } = ForOfStatement;

    switch (true) {
      case !!LeftHandSideExpression:
        {
          let _temp14 = yield* ForInOfHeadEvaluation([], AssignmentExpression, 'iterate');

          if (_temp14 instanceof AbruptCompletion) {
            return _temp14;
          }

          if (_temp14 instanceof Completion) {
            _temp14 = _temp14.Value;
          }

          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », AssignmentExpression, iterate).
          const keyResult = _temp14; // 2. Return ? ForIn/OfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, iterate, assignment, labelSet).

          return yield* ForInOfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, 'iterate', 'assignment', labelSet);
        }

      case !!ForBinding:
        {
          let _temp15 = yield* ForInOfHeadEvaluation([], AssignmentExpression, 'iterate');

          if (_temp15 instanceof AbruptCompletion) {
            return _temp15;
          }

          if (_temp15 instanceof Completion) {
            _temp15 = _temp15.Value;
          }

          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », AssignmentExpression, iterate).
          const keyResult = _temp15; // 2. Return ? ForIn/OfBodyEvaluation(ForBinding, Statement, keyResult, iterate, varBinding, labelSet).

          return yield* ForInOfBodyEvaluation(ForBinding, Statement, keyResult, 'iterate', 'varBinding', labelSet);
        }

      case !!ForDeclaration:
        {
          let _temp16 = yield* ForInOfHeadEvaluation(BoundNames(ForDeclaration), AssignmentExpression, 'iterate');

          if (_temp16 instanceof AbruptCompletion) {
            return _temp16;
          }

          if (_temp16 instanceof Completion) {
            _temp16 = _temp16.Value;
          }

          // 1. Let keyResult be ? ForIn/OfHeadEvaluation(BoundNames of ForDeclaration, AssignmentExpression, iterate).
          const keyResult = _temp16; // 2. Return ? ForIn/OfBodyEvaluation(ForDeclaration, Statement, keyResult, iterate, lexicalBinding, labelSet).

          return yield* ForInOfBodyEvaluation(ForDeclaration, Statement, keyResult, 'iterate', 'lexicalBinding', labelSet);
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('LabelledEvaluation_BreakableStatement_ForOfStatement', ForOfStatement);
    }
  } // #sec-forbodyevaluation


  LabelledEvaluation_IterationStatement_ForOfStatement.section = 'https://tc39.es/ecma262/#sec-for-in-and-for-of-statements-runtime-semantics-labelledevaluation';

  function* ForBodyEvaluation(test, increment, stmt, perIterationBindings, labelSet) {
    // 1. Let V be undefined.
    let V = Value.undefined; // 2. Perform ? CreatePerIterationEnvironment(perIterationBindings).

    let _temp17 = CreatePerIterationEnvironment(perIterationBindings);

    if (_temp17 instanceof AbruptCompletion) {
      return _temp17;
    }

    if (_temp17 instanceof Completion) {
      _temp17 = _temp17.Value;
    }

    while (true) {
      // a. If test is not [empty], then
      if (test) {
        // i. Let testRef be the result of evaluating test.
        const testRef = yield* Evaluate(test); // ii. Let testValue be ? GetValue(testRef).

        let _temp18 = GetValue(testRef);

        if (_temp18 instanceof AbruptCompletion) {
          return _temp18;
        }

        if (_temp18 instanceof Completion) {
          _temp18 = _temp18.Value;
        }

        const testValue = _temp18; // iii. If ! ToBoolean(testValue) is false, return NormalCompletion(V).

        let _temp19 = ToBoolean(testValue);

        Assert(!(_temp19 instanceof AbruptCompletion), "ToBoolean(testValue)" + ' returned an abrupt completion');

        if (_temp19 instanceof Completion) {
          _temp19 = _temp19.Value;
        }

        if (_temp19 === Value.false) {
          return NormalCompletion(V);
        }
      } // b. Let result be the result of evaluating stmt.


      const result = EnsureCompletion(yield* Evaluate(stmt)); // c. If LoopContinues(result, labelSet) is false, return Completion(UpdateEmpty(result, V)).

      if (LoopContinues(result, labelSet) === Value.false) {
        return Completion(UpdateEmpty(result, V));
      } // d. If result.[[Value]] is not empty, set V to result.[[Value]].


      if (result.Value !== undefined) {
        V = result.Value;
      } // e. Perform ? CreatePerIterationEnvironment(perIterationBindings).


      let _temp20 = CreatePerIterationEnvironment(perIterationBindings);

      if (_temp20 instanceof AbruptCompletion) {
        return _temp20;
      }

      if (_temp20 instanceof Completion) {
        _temp20 = _temp20.Value;
      }

      if (increment) {
        // i. Let incRef be the result of evaluating increment.
        const incRef = yield* Evaluate(increment); // ii. Perform ? GetValue(incRef).

        let _temp21 = GetValue(incRef);

        if (_temp21 instanceof AbruptCompletion) {
          return _temp21;
        }

        if (_temp21 instanceof Completion) {
          _temp21 = _temp21.Value;
        }
      }
    }
  } // #sec-createperiterationenvironment


  ForBodyEvaluation.section = 'https://tc39.es/ecma262/#sec-forbodyevaluation';

  function CreatePerIterationEnvironment(perIterationBindings) {
    // 1. If perIterationBindings has any elements, then
    if (perIterationBindings.length > 0) {
      // a. Let lastIterationEnv be the running execution context's LexicalEnvironment.
      const lastIterationEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // b. Let outer be lastIterationEnv.[[OuterEnv]].

      const outer = lastIterationEnv.OuterEnv; // c. Assert: outer is not null.

      Assert(outer !== Value.null, "outer !== Value.null"); // d. Let thisIterationEnv be NewDeclarativeEnvironment(outer).

      const thisIterationEnv = NewDeclarativeEnvironment(outer); // e. For each element bn of perIterationBindings, do

      for (const bn of perIterationBindings) {
        let _temp22 = thisIterationEnv.CreateMutableBinding(bn, Value.false);

        Assert(!(_temp22 instanceof AbruptCompletion), "thisIterationEnv.CreateMutableBinding(bn, Value.false)" + ' returned an abrupt completion');

        if (_temp22 instanceof Completion) {
          _temp22 = _temp22.Value;
        }

        let _temp23 = lastIterationEnv.GetBindingValue(bn, Value.true);

        if (_temp23 instanceof AbruptCompletion) {
          return _temp23;
        }

        if (_temp23 instanceof Completion) {
          _temp23 = _temp23.Value;
        }

        const lastValue = _temp23; // iii. Perform thisIterationEnv.InitializeBinding(bn, lastValue).

        thisIterationEnv.InitializeBinding(bn, lastValue);
      } // f. Set the running execution context's LexicalEnvironment to thisIterationEnv.


      exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = thisIterationEnv;
    } // 2. Return undefined.


    return Value.undefined;
  } // #sec-runtime-semantics-forinofheadevaluation


  CreatePerIterationEnvironment.section = 'https://tc39.es/ecma262/#sec-createperiterationenvironment';

  function* ForInOfHeadEvaluation(uninitializedBoundNames, expr, iterationKind) {
    // 1. Let oldEnv be the running execution context's LexicalEnvironment.
    const oldEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. If uninitializedBoundNames is not an empty List, then

    if (uninitializedBoundNames.length > 0) {
      // a. Assert: uninitializedBoundNames has no duplicate entries.
      // b. Let newEnv be NewDeclarativeEnvironment(oldEnv).
      const newEnv = NewDeclarativeEnvironment(oldEnv); // c. For each string name in uninitializedBoundNames, do

      for (const name of uninitializedBoundNames) {
        let _temp24 = newEnv.CreateMutableBinding(name, Value.false);

        Assert(!(_temp24 instanceof AbruptCompletion), "newEnv.CreateMutableBinding(name, Value.false)" + ' returned an abrupt completion');

        if (_temp24 instanceof Completion) {
          _temp24 = _temp24.Value;
        }
      } // d. Set the running execution context's LexicalEnvironment to newEnv.


      exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = newEnv;
    } // 3. Let exprRef be the result of evaluating expr.


    const exprRef = yield* Evaluate(expr); // 4. Set the running execution context's LexicalEnvironment to oldEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // 5. Let exprValue be ? GetValue(exprRef).

    let _temp25 = GetValue(exprRef);

    if (_temp25 instanceof AbruptCompletion) {
      return _temp25;
    }

    if (_temp25 instanceof Completion) {
      _temp25 = _temp25.Value;
    }

    const exprValue = _temp25; // 6. If iterationKind is enumerate, then

    if (iterationKind === 'enumerate') {
      // a. If exprValue is undefined or null, then
      if (exprValue === Value.undefined || exprValue === Value.null) {
        // i. Return Completion { [[Type]]: break, [[Value]]: empty, [[Target]]: empty }.
        return new Completion({
          Type: 'break',
          Value: undefined,
          Target: undefined
        });
      } // b. Let obj be ! ToObject(exprValue).


      let _temp26 = ToObject(exprValue);

      Assert(!(_temp26 instanceof AbruptCompletion), "ToObject(exprValue)" + ' returned an abrupt completion');

      if (_temp26 instanceof Completion) {
        _temp26 = _temp26.Value;
      }

      const obj = _temp26; // c. Let iterator be ? EnumerateObjectProperties(obj).

      let _temp27 = EnumerateObjectProperties(obj);

      if (_temp27 instanceof AbruptCompletion) {
        return _temp27;
      }

      if (_temp27 instanceof Completion) {
        _temp27 = _temp27.Value;
      }

      const iterator = _temp27; // d. Let nextMethod be ! GetV(iterator, "next").

      let _temp28 = GetV(iterator, new Value('next'));

      Assert(!(_temp28 instanceof AbruptCompletion), "GetV(iterator, new Value('next'))" + ' returned an abrupt completion');

      if (_temp28 instanceof Completion) {
        _temp28 = _temp28.Value;
      }

      const nextMethod = _temp28; // e. Return the Record { [[Iterator]]: iterator, [[NextMethod]]: nextMethod, [[Done]]: false }.

      return {
        Iterator: iterator,
        NextMethod: nextMethod,
        Done: Value.false
      };
    } else {
      // 7. Else,
      // a. Assert: iterationKind is iterate or async-iterate.
      Assert(iterationKind === 'iterate' || iterationKind === 'async-iterate', "iterationKind === 'iterate' || iterationKind === 'async-iterate'"); // b. If iterationKind is async-iterate, let iteratorHint be async.
      // c. Else, let iteratorHint be sync.

      const iteratorHint = iterationKind === 'async-iterate' ? 'async' : 'sync'; // d. Return ? GetIterator(exprValue, iteratorHint).

      return GetIterator(exprValue, iteratorHint);
    }
  } // #sec-enumerate-object-properties


  ForInOfHeadEvaluation.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-forinofheadevaluation';

  function EnumerateObjectProperties(O) {
    return CreateForInIterator(O);
  } // #sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset


  EnumerateObjectProperties.section = 'https://tc39.es/ecma262/#sec-enumerate-object-properties';

  function* ForInOfBodyEvaluation(lhs, stmt, iteratorRecord, iterationKind, lhsKind, labelSet, iteratorKind) {
    // 1. If iteratorKind is not present, set iteratorKind to sync.
    if (iterationKind === undefined) {
      iterationKind = 'sync';
    } // 2. Let oldEnv be the running execution context's LexicalEnvironment.


    const oldEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 3. Let V be undefined.

    let V = Value.undefined; // 4. Let destructuring be IsDestructuring of lhs.

    const destructuring = IsDestructuring(lhs); // 5. If destructuring is true and if lhsKind is assignment, then

    let assignmentPattern;

    if (destructuring && lhsKind === 'assignment') {
      // a. Assert: lhs is a LeftHandSideExpression.
      // b. Let assignmentPattern be the AssignmentPattern that is covered by lhs.
      assignmentPattern = refineLeftHandSideExpression(lhs);
    } // 6. Repeat,


    while (true) {
      let _temp29 = Call(iteratorRecord.NextMethod, iteratorRecord.Iterator);

      if (_temp29 instanceof AbruptCompletion) {
        return _temp29;
      }

      if (_temp29 instanceof Completion) {
        _temp29 = _temp29.Value;
      }

      // a. Let nextResult be ? Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]]).
      let nextResult = _temp29; // b. If iteratorKind is async, then set nextResult to ? Await(nextResult).

      if (iteratorKind === 'async') {
        let _temp30 = yield* Await(nextResult);

        if (_temp30 instanceof AbruptCompletion) {
          return _temp30;
        }

        if (_temp30 instanceof Completion) {
          _temp30 = _temp30.Value;
        }

        nextResult = _temp30;
      } // c. If Type(nextResult) is not Object, throw a TypeError exception.


      if (Type(nextResult) !== 'Object') {
        return exports.surroundingAgent.Throw('TypeError', 'NotAnObject', nextResult);
      } // d. Let done be ? IteratorComplete(nextResult).


      let _temp31 = IteratorComplete(nextResult);

      if (_temp31 instanceof AbruptCompletion) {
        return _temp31;
      }

      if (_temp31 instanceof Completion) {
        _temp31 = _temp31.Value;
      }

      const done = _temp31; // e. If done is true, return NormalCompletion(V).

      if (done === Value.true) {
        return NormalCompletion(V);
      } // f. Let nextValue be ? IteratorValue(nextResult).


      let _temp32 = IteratorValue(nextResult);

      if (_temp32 instanceof AbruptCompletion) {
        return _temp32;
      }

      if (_temp32 instanceof Completion) {
        _temp32 = _temp32.Value;
      }

      const nextValue = _temp32; // g. If lhsKind is either assignment or varBinding, then

      let lhsRef;
      let iterationEnv;

      if (lhsKind === 'assignment' || lhsKind === 'varBinding') {
        // i. If destructuring is false, then
        if (destructuring === false) {
          // 1. Let lhsRef be the result of evaluating lhs. (It may be evaluated repeatedly.)
          lhsRef = yield* Evaluate(lhs);
        }
      } else {
        // h. Else,
        // i. Assert: lhsKind is lexicalBinding.
        Assert(lhsKind === 'lexicalBinding', "lhsKind === 'lexicalBinding'"); // ii. Assert: lhs is a ForDeclaration.

        Assert(lhs.type === 'ForDeclaration', "lhs.type === 'ForDeclaration'"); // iii. Let iterationEnv be NewDeclarativeEnvironment(oldEnv).

        iterationEnv = NewDeclarativeEnvironment(oldEnv); // iv. Perform BindingInstantiation for lhs passing iterationEnv as the argument.

        BindingInstantiation(lhs, iterationEnv); // v. Set the running execution context's LexicalEnvironment to iterationEnv.

        exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = iterationEnv; // vi. If destructuring is false, then

        if (destructuring === false) {
          // 1. Assert: lhs binds a single name.
          // 2. Let lhsName be the sole element of BoundNames of lhs.
          const lhsName = BoundNames(lhs)[0]; // 3. Let lhsRef be ! ResolveBinding(lhsName).

          let _temp33 = ResolveBinding(lhsName, undefined, lhs.strict);

          Assert(!(_temp33 instanceof AbruptCompletion), "ResolveBinding(lhsName, undefined, lhs.strict)" + ' returned an abrupt completion');

          if (_temp33 instanceof Completion) {
            _temp33 = _temp33.Value;
          }

          lhsRef = _temp33;
        }
      }

      let status; // i. If destructuring is false, then

      if (destructuring === false) {
        // i. If lhsRef is an abrupt completion, then
        if (lhsRef instanceof AbruptCompletion) {
          // 1. Let status be lhsRef.
          status = lhsRef;
        } else if (lhsKind === 'lexicalBinding') {
          // ii. Else is lhsKind is lexicalBinding, then
          // 1. Let status be InitializeReferencedBinding(lhsRef, nextValue).
          status = InitializeReferencedBinding(lhsRef, nextValue);
        } else {
          // iii. Else,
          status = PutValue(lhsRef, nextValue);
        }
      } else {
        // j. Else,
        // i. If lhsKind is assignment, then
        if (lhsKind === 'assignment') {
          // 1. Let status be DestructuringAssignmentEvaluation of assignmentPattern with argument nextValue.
          status = yield* DestructuringAssignmentEvaluation(assignmentPattern, nextValue);
        } else if (lhsKind === 'varBinding') {
          // ii. Else if lhsKind is varBinding, then
          // 1. Assert: lhs is a ForBinding.
          Assert(lhs.type === 'ForBinding', "lhs.type === 'ForBinding'"); // 2. Let status be BindingInitialization of lhs with arguments nextValue and undefined.

          status = yield* BindingInitialization(lhs, nextValue, Value.undefined);
        } else {
          // iii. Else,
          // 1. Assert: lhsKind is lexicalBinding.
          Assert(lhsKind === 'lexicalBinding', "lhsKind === 'lexicalBinding'"); // 2. Assert: lhs is a ForDeclaration.

          Assert(lhs.type === 'ForDeclaration', "lhs.type === 'ForDeclaration'"); // 3. Let status be BindingInitialization of lhs with arguments nextValue and iterationEnv.

          status = yield* BindingInitialization(lhs, nextValue, iterationEnv);
        }
      } // k. If status is an abrupt completion, then


      if (status instanceof AbruptCompletion) {
        // i. Set the running execution context's LexicalEnvironment to oldEnv.
        exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // ii. If iteratorKind is async, return ? AsyncIteratorClose(iteratorRecord, status).

        if (iteratorKind === 'async') {
          return yield* AsyncIteratorClose(iteratorRecord, status);
        } // iii. if iterationKind is enumerate, then


        if (iterationKind === 'enumerate') {
          // 1. Return status.
          return status;
        } else {
          // iv. Else,
          // 1. Assert: iterationKind is iterate.
          Assert(iterationKind === 'iterate', "iterationKind === 'iterate'"); // 2 .Return ? IteratorClose(iteratorRecord, status).

          return IteratorClose(iteratorRecord, status);
        }
      } // l. Let result be the result of evaluating stmt.


      const result = EnsureCompletion(yield* Evaluate(stmt)); // m. Set the running execution context's LexicalEnvironment to oldEnv.

      exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // n. If LoopContinues(result, labelSet) is false, then

      if (LoopContinues(result, labelSet) === Value.false) {
        // i. If iterationKind is enumerate, then
        if (iterationKind === 'enumerate') {
          // 1. Return Completion(UpdateEmpty(result, V)).
          return Completion(UpdateEmpty(result, V));
        } else {
          // ii. Else,
          // 1. Assert: iterationKind is iterate.
          Assert(iterationKind === 'iterate', "iterationKind === 'iterate'"); // 2. Set status to UpdateEmpty(result, V).

          status = UpdateEmpty(result, V); // 3. If iteratorKind is async, return ? AsyncIteratorClose(iteratorRecord, status).

          if (iteratorKind === 'async') {
            return yield* AsyncIteratorClose(iteratorRecord, status);
          } // 4. Return ? IteratorClose(iteratorRecord, status).


          return IteratorClose(iteratorRecord, status);
        }
      } // o. If result.[[Value]] is not empty, set V to result.[[Value]].


      if (result.Value !== undefined) {
        V = result.Value;
      }
    }
  } // #sec-runtime-semantics-bindinginstantiation
  //   ForDeclaration : LetOrConst ForBinding


  ForInOfBodyEvaluation.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset';

  function BindingInstantiation({
    LetOrConst,
    ForBinding
  }, environment) {
    // 1. Assert: environment is a declarative Environment Record.
    Assert(environment instanceof DeclarativeEnvironmentRecord, "environment instanceof DeclarativeEnvironmentRecord"); // 2. For each element name of the BoundNames of ForBinding, do

    for (const name of BoundNames(ForBinding)) {
      // a. If IsConstantDeclaration of LetOrConst is true, then
      if (IsConstantDeclaration(LetOrConst)) {
        let _temp34 = environment.CreateImmutableBinding(name, Value.true);

        Assert(!(_temp34 instanceof AbruptCompletion), "environment.CreateImmutableBinding(name, Value.true)" + ' returned an abrupt completion');

        if (_temp34 instanceof Completion) {
          _temp34 = _temp34.Value;
        }
      } else {
        let _temp35 = environment.CreateMutableBinding(name, Value.false);

        Assert(!(_temp35 instanceof AbruptCompletion), "environment.CreateMutableBinding(name, Value.false)" + ' returned an abrupt completion');

        if (_temp35 instanceof Completion) {
          _temp35 = _temp35.Value;
        }
      }
    }
  } // #sec-for-in-and-for-of-statements-runtime-semantics-evaluation
  //   ForBinding : BindingIdentifier


  BindingInstantiation.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-bindinginstantiation';
  function Evaluate_ForBinding({
    BindingIdentifier,
    strict
  }) {
    // 1. Let bindingId be StringValue of BindingIdentifier.
    const bindingId = StringValue(BindingIdentifier); // 2. Return ? ResolveBinding(bindingId).

    return ResolveBinding(bindingId, undefined, strict);
  }

  //   TemplateLiteral : NoSubstitutionTemplate
  //   SubstitutionTemplate : TemplateHead Expression TemplateSpans
  //   TemplateSpans : TemplateTail
  //   TemplateSpans : TemplateMiddleList TemplateTail
  //   TemplateMiddleList : TemplateMiddle Expression
  //   TemplateMiddleList : TemplateMiddleList TemplateMiddle Expression
  //
  // (implicit)
  //   TemplateLiteral : SubstitutionTemplate

  function* Evaluate_TemplateLiteral({
    TemplateSpanList,
    ExpressionList
  }) {
    let str = '';

    for (let i = 0; i < TemplateSpanList.length - 1; i += 1) {
      const Expression = ExpressionList[i];
      const head = TV(TemplateSpanList[i]); // 2. Let subRef be the result of evaluating Expression.

      const subRef = yield* Evaluate(Expression); // 3. Let sub be ? GetValue(subRef).

      let _temp = GetValue(subRef);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      const sub = _temp; // 4. Let middle be ? ToString(sub).

      let _temp2 = ToString(sub);

      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      const middle = _temp2;
      str += head;
      str += middle.stringValue();
    }

    const tail = TV(TemplateSpanList[TemplateSpanList.length - 1]);
    return new Value(str + tail);
  }

  function* CaseClauseIsSelected(C, input) {
    // 1. Assert: C is an instance of the production  CaseClause : `case` Expression `:` StatementList?.
    Assert(C.type === 'CaseClause', "C.type === 'CaseClause'"); // 2. Let exprRef be the result of evaluating the Expression of C.

    const exprRef = yield* Evaluate(C.Expression); // 3. Let clauseSelector be ? GetValue(exprRef).

    let _temp = GetValue(exprRef);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const clauseSelector = _temp; // 4. Return the result of performing Strict Equality Comparison input === clauseSelector.

    return StrictEqualityComparison(input, clauseSelector);
  } // #sec-runtime-semantics-caseblockevaluation
  //   CaseBlock :
  //     `{` `}`
  //     `{` CaseClauses `}`
  //     `{` CaseClauses? DefaultClause CaseClauses? `}`


  CaseClauseIsSelected.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-caseclauseisselected';

  function* CaseBlockEvaluation({
    CaseClauses_a,
    DefaultClause,
    CaseClauses_b
  }, input) {
    switch (true) {
      case !CaseClauses_a && !DefaultClause && !CaseClauses_b:
        {
          // 1. Return NormalCompletion(undefined).
          return NormalCompletion(Value.undefined);
        }

      case !!CaseClauses_a && !DefaultClause && !CaseClauses_b:
        {
          // 1. Let V be undefined.
          let V = Value.undefined; // 2. Let A be the List of CaseClause items in CaseClauses, in source text order.

          const A = CaseClauses_a; // 3. Let found be false.

          let found = Value.false; // 4. For each CaseClause C in A, do

          for (const C of A) {
            // a. If found is false, then
            if (found === Value.false) {
              let _temp2 = yield* CaseClauseIsSelected(C, input);

              if (_temp2 instanceof AbruptCompletion) {
                return _temp2;
              }

              if (_temp2 instanceof Completion) {
                _temp2 = _temp2.Value;
              }

              // i. Set found to ? CaseClauseIsSelected(C, input).
              found = _temp2;
            } // b. If found is true, them


            if (found === Value.true) {
              // i. Let R be the result of evaluating C.
              const R = EnsureCompletion(yield* Evaluate(C)); // ii. If R.[[Value]] is not empty, set V to R.[[Value]].

              if (R.Value !== undefined) {
                V = R.Value;
              } // iii. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).


              if (R instanceof AbruptCompletion) {
                return Completion(UpdateEmpty(R, V));
              }
            }
          } // 5. Return NormalCompletion(V).


          return NormalCompletion(V);
        }

      case !!DefaultClause:
        {
          // 1. Let V be undefined.
          let V = Value.undefined; // 2. If the first CaseClauses is present, then

          let A;

          if (CaseClauses_a) {
            // a. Let A be the List of CaseClause items in the first CaseClauses, in source text order.
            A = CaseClauses_a;
          } else {
            // 3. Else,
            // a. Let A be « ».
            A = [];
          }

          let found = Value.false; // 4. For each CaseClause C in A, do

          for (const C of A) {
            // a. If found is false, then
            if (found === Value.false) {
              let _temp3 = yield* CaseClauseIsSelected(C, input);

              if (_temp3 instanceof AbruptCompletion) {
                return _temp3;
              }

              if (_temp3 instanceof Completion) {
                _temp3 = _temp3.Value;
              }

              // i. Set found to ? CaseClauseIsSelected(C, input).
              found = _temp3;
            } // b. If found is true, them


            if (found === Value.true) {
              // i. Let R be the result of evaluating C.
              const R = EnsureCompletion(yield* Evaluate(C)); // ii. If R.[[Value]] is not empty, set V to R.[[Value]].

              if (R.Value !== undefined) {
                V = R.Value;
              } // iii. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).


              if (R instanceof AbruptCompletion) {
                return Completion(UpdateEmpty(R, V));
              }
            }
          } // 6. Let foundInB be false.


          let foundInB = Value.false; // 7. If the second CaseClauses is present, then

          let B;

          if (CaseClauses_b) {
            // a. Let B be the List of CaseClause items in the second CaseClauses, in source text order.
            B = CaseClauses_b;
          } else {
            // 8. Else,
            // a. Let B be « ».
            B = [];
          } // 9. If found is false, then


          if (found === Value.false) {
            // a. For each CaseClause C in B, do
            for (const C of B) {
              // a. If foundInB is false, then
              if (foundInB === Value.false) {
                let _temp4 = yield* CaseClauseIsSelected(C, input);

                if (_temp4 instanceof AbruptCompletion) {
                  return _temp4;
                }

                if (_temp4 instanceof Completion) {
                  _temp4 = _temp4.Value;
                }

                // i. Set foundInB to ? CaseClauseIsSelected(C, input).
                foundInB = _temp4;
              } // b. If foundInB is true, them


              if (foundInB === Value.true) {
                // i. Let R be the result of evaluating C.
                const R = EnsureCompletion(yield* Evaluate(C)); // ii. If R.[[Value]] is not empty, set V to R.[[Value]].

                if (R.Value !== undefined) {
                  V = R.Value;
                } // iii. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).


                if (R instanceof AbruptCompletion) {
                  return Completion(UpdateEmpty(R, V));
                }
              }
            }
          } // 10. If foundInB is true, return NormalCompletion(V).


          if (foundInB === Value.true) {
            return NormalCompletion(V);
          } // 11. Let R be the result of evaluating DefaultClause.


          const R = EnsureCompletion(yield* Evaluate(DefaultClause)); // 12. If R.[[Value]] is not empty, set V to R.[[Value]].

          if (R.Value !== undefined) {
            V = R.Value;
          } // 13. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).


          if (R instanceof AbruptCompletion) {
            return Completion(UpdateEmpty(R, V));
          } // 14. NOTE: The following is another complete iteration of the second CaseClauses.
          // 15. For each CaseClause C in B, do


          for (const C of B) {
            // a. Let R be the result of evaluating CaseClause C.
            const innerR = EnsureCompletion(yield* Evaluate(C)); // b. If R.[[Value]] is not empty, set V to R.[[Value]].

            if (innerR.Value !== undefined) {
              V = innerR.Value;
            } // c. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).


            if (innerR instanceof AbruptCompletion) {
              return Completion(UpdateEmpty(innerR, V));
            }
          } // 16. Return NormalCompletion(V).
          //


          return NormalCompletion(V);
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('CaseBlockEvaluation');
    }
  } // #sec-switch-statement-runtime-semantics-evaluation
  //   SwitchStatement :
  //     `switch` `(` Expression `)` CaseBlock


  CaseBlockEvaluation.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-caseblockevaluation';
  function* Evaluate_SwitchStatement({
    Expression,
    CaseBlock
  }) {
    // 1. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression); // 2. Let switchValue be ? GetValue(exprRef).

    let _temp5 = GetValue(exprRef);

    if (_temp5 instanceof AbruptCompletion) {
      return _temp5;
    }

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    const switchValue = _temp5; // 3. Let oldEnv be the running execution context's LexicalEnvironment.

    const oldEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Let blockEnv be NewDeclarativeEnvironment(oldEnv).

    const blockEnv = NewDeclarativeEnvironment(oldEnv); // 5. Perform BlockDeclarationInstantiation(CaseBlock, blockEnv).

    BlockDeclarationInstantiation(CaseBlock, blockEnv); // 6. Set the running execution context's LexicalEnvironment to blockEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv; // 7. Let R be CaseBlockEvaluation of CaseBlock with argument switchValue.

    const R = yield* CaseBlockEvaluation(CaseBlock, switchValue); // 8. Set the running execution context's LexicalEnvironment to oldEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // 9. return R.

    return R;
  } // #sec-switch-statement-runtime-semantics-evaluation
  //   CaseClause :
  //     `case` Expression `:`
  //     `case` Expression `:` StatementList
  //   DefaultClause :
  //     `case` `default` `:`
  //     `case` `default` `:` StatementList

  function* Evaluate_CaseClause({
    StatementList
  }) {
    if (!StatementList) {
      // 1. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    } // 1. Return the result of evaluating StatementList.


    return yield* Evaluate_StatementList(StatementList);
  }

  function handleError(e) {
    if (e.name === 'SyntaxError') {
      const v = exports.surroundingAgent.Throw('SyntaxError', 'Raw', e.message).Value;

      if (e.decoration) {
        const stackString = new Value('stack');

        let _temp = Get(v, stackString);

        Assert(!(_temp instanceof AbruptCompletion), "Get(v, stackString)" + ' returned an abrupt completion');
        /* istanbul ignore if */

        if (_temp instanceof Completion) {
          _temp = _temp.Value;
        }

        const stack = _temp.stringValue();

        const newStackString = `${e.decoration}\n${stack}`;

        let _temp2 = Set$1(v, stackString, new Value(newStackString), Value.true);

        Assert(!(_temp2 instanceof AbruptCompletion), "Set(v, stackString, new Value(newStackString), Value.true)" + ' returned an abrupt completion');

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }
      }

      return v;
    } else {
      throw e;
    }
  }

  function wrappedParse(init, f) {
    const p = new Parser(init);

    try {
      const r = f(p);

      if (p.earlyErrors.size > 0) {
        return [...p.earlyErrors].map(e => handleError(e));
      }

      return r;
    } catch (e) {
      return [handleError(e)];
    }
  }
  function ParseScript(sourceText, realm, hostDefined = {}) {
    var _hostDefined$kInterna;

    // 1. Assert: sourceText is an ECMAScript source text (see clause 10).
    // 2. Parse sourceText using Script as the goal symbol and analyse the parse result for
    //    any Early Error conditions. If the parse was successful and no early errors were found,
    //    let body be the resulting parse tree. Otherwise, let body be a List of one or more
    //    SyntaxError objects representing the parsing errors and/or early errors. Parsing and
    //    early error detection may be interweaved in an implementation-dependent manner. If more
    //    than one parsing error or early error is present, the number and ordering of error
    //    objects in the list is implementation-dependent, but at least one must be present.
    const body = wrappedParse({
      source: sourceText,
      specifier: hostDefined.specifier,
      json: (_hostDefined$kInterna = hostDefined[kInternal]) === null || _hostDefined$kInterna === void 0 ? void 0 : _hostDefined$kInterna.json
    }, p => p.parseScript()); // 3. If body is a List of errors, return body.

    if (Array.isArray(body)) {
      return body;
    } // 4. Return Script Record { [[Realm]]: realm, [[Environment]]: undefined, [[ECMAScriptCode]]: body, [[HostDefined]]: hostDefined }.


    return {
      Realm: realm,
      Environment: Value.undefined,
      ECMAScriptCode: body,
      HostDefined: hostDefined,

      mark(m) {
        m(this.Realm);
        m(this.Environment);
      }

    };
  }
  function ParseModule(sourceText, realm, hostDefined = {}) {
    // 1. Assert: sourceText is an ECMAScript source text (see clause 10).
    // 2. Parse sourceText using Module as the goal symbol and analyse the parse result for
    //    any Early Error conditions. If the parse was successful and no early errors were found,
    //    let body be the resulting parse tree. Otherwise, let body be a List of one or more
    //    SyntaxError objects representing the parsing errors and/or early errors. Parsing and
    //    early error detection may be interweaved in an implementation-dependent manner. If more
    //    than one parsing error or early error is present, the number and ordering of error
    //    objects in the list is implementation-dependent, but at least one must be present.
    const body = wrappedParse({
      source: sourceText,
      specifier: hostDefined.specifier
    }, p => p.parseModule()); // 3. If body is a List of errors, return body.

    if (Array.isArray(body)) {
      return body;
    } // 4. Let requestedModules be the ModuleRequests of body.


    const requestedModules = ModuleRequests(body); // 5. Let importEntries be ImportEntries of body.

    const importEntries = ImportEntries(body); // 6. Let importedBoundNames be ImportedLocalNames(importEntries).

    const importedBoundNames = new ValueSet(ImportedLocalNames(importEntries)); // 7. Let indirectExportEntries be a new empty List.

    const indirectExportEntries = []; // 8. Let localExportEntries be a new empty List.

    const localExportEntries = []; // 9. Let starExportEntries be a new empty List.

    const starExportEntries = []; // 10. Let exportEntries be ExportEntries of body.

    const exportEntries = ExportEntries(body); // 11. For each ExportEntry Record ee in exportEntries, do

    for (const ee of exportEntries) {
      // a. If ee.[[ModuleRequest]] is null, then
      if (ee.ModuleRequest === Value.null) {
        // i. If ee.[[LocalName]] is not an element of importedBoundNames, then
        if (!importedBoundNames.has(ee.LocalName)) {
          // 1. Append ee to localExportEntries.
          localExportEntries.push(ee);
        } else {
          // ii. Else,
          // 1. Let ie be the element of importEntries whose [[LocalName]] is the same as ee.[[LocalName]].
          const ie = importEntries.find(e => e.LocalName.stringValue() === ee.LocalName.stringValue()); // 2. If ie.[[ImportName]] is ~star~, then

          if (ie.ImportName === 'star') {
            // a. NOTE: This is a re-export of an imported module namespace object.
            // b. Append ee to localExportEntries.
            localExportEntries.push(ee);
          } else {
            // 3. Else,
            // a. NOTE: This is a re-export of a single name.
            // b. Append the ExportEntry Record { [[ModuleRequest]]: ie.[[ModuleRequest]], [[ImportName]]: ie.[[ImportName]], [[LocalName]]: null, [[ExportName]]: ee.[[ExportName]] } to indirectExportEntries.
            indirectExportEntries.push({
              ModuleRequest: ie.ModuleRequest,
              ImportName: ie.ImportName,
              LocalName: Value.null,
              ExportName: ee.ExportName
            });
          }
        }
      } else if (ee.ImportName && ee.ImportName === 'star' && ee.ExportName === Value.null) {
        // b. Else if ee.[[ImportName]] is ~star~ and ee.[[ExportName]] is null, then
        // i. Append ee to starExportEntries.
        starExportEntries.push(ee);
      } else {
        // c. Else,
        // i. Append ee to indirectExportEntries.
        indirectExportEntries.push(ee);
      }
    } // 12. Return Source Text Module Record { [[Realm]]: realm, [[Environment]]: undefined, [[Namespace]]: undefined, [[Status]]: unlinked, [[EvaluationError]]: undefined, [[HostDefined]]: hostDefined, [[ECMAScriptCode]]: body, [[Context]]: empty, [[ImportMeta]]: empty, [[RequestedModules]]: requestedModules, [[ImportEntries]]: importEntries, [[LocalExportEntries]]: localExportEntries, [[IndirectExportEntries]]: indirectExportEntries, [[StarExportEntries]]: starExportEntries, [[DFSIndex]]: undefined, [[DFSAncestorIndex]]: undefined }.


    return new (hostDefined.SourceTextModuleRecord || SourceTextModuleRecord)({
      Realm: realm,
      Environment: Value.undefined,
      Namespace: Value.undefined,
      Status: 'unlinked',
      EvaluationError: Value.undefined,
      HostDefined: hostDefined,
      ECMAScriptCode: body,
      Context: undefined,
      ImportMeta: undefined,
      RequestedModules: requestedModules,
      ImportEntries: importEntries,
      LocalExportEntries: localExportEntries,
      IndirectExportEntries: indirectExportEntries,
      StarExportEntries: starExportEntries,
      DFSIndex: Value.undefined,
      DFSAncestorIndex: Value.undefined,
      Async: body.hasTopLevelAwait ? Value.true : Value.false,
      AsyncEvaluating: Value.false,
      TopLevelCapability: Value.undefined,
      AsyncParentModules: Value.undefined,
      PendingAsyncDependencies: Value.undefined
    });
  } // #sec-parsepattern

  function ParsePattern(patternText, u) {
    const parse = flags => {
      const p = new RegExpParser(patternText);
      return p.scope(flags, () => p.parsePattern());
    };

    try {
      // 1. If u is true, then
      if (u) {
        // a. Parse patternText using the grammars in 21.2.1. The goal symbol for the parse is Pattern[+U, +N].
        return parse({
          U: true,
          N: true
        });
      } else {
        // 2. Else
        // a. Parse patternText using the grammars in 21.2.1. The goal symbol for the parse is Pattern[~U, ~N].
        //    If the result of parsing contains a GroupName, reparse with the goal symbol Pattern[~U, +N] and use this result instead.
        const pattern = parse({
          U: false,
          N: false
        });

        if (pattern.groupSpecifiers.size > 0) {
          return parse({
            U: false,
            N: true
          });
        }

        return pattern;
      }
    } catch (e) {
      return [handleError(e)];
    }
  }

  const DynamicFunctionSourceTextPrefixes = {
    'normal': 'function',
    'generator': 'function*',
    'async': 'async function',
    'asyncGenerator': 'async function*'
  };
  function CreateDynamicFunction(constructor, newTarget, kind, args) {
    // 1. Assert: The execution context stack has at least two elements.
    Assert(exports.surroundingAgent.executionContextStack.length >= 2, "surroundingAgent.executionContextStack.length >= 2"); // 2. Let callerContext be the second to top element of the execution context stack.

    const callerContext = exports.surroundingAgent.executionContextStack[exports.surroundingAgent.executionContextStack.length - 2]; // 3. Let callerRealm be callerContext's Realm.

    const callerRealm = callerContext.Realm; // 4. Let calleeRealm be the current Realm Record.

    const calleeRealm = exports.surroundingAgent.currentRealmRecord; // 5. Perform ? HostEnsureCanCompileStrings(callerRealm, calleeRealm).

    let _temp = HostEnsureCanCompileStrings(callerRealm, calleeRealm);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    if (Type(newTarget) === 'Undefined') {
      newTarget = constructor;
    } // 7. If kind is normal, then


    let fallbackProto;

    if (kind === 'normal') {
      // a. Let goal be the grammar symbol FunctionBody[~Yield, ~Await].
      // b. Let parameterGoal be the grammar symbol FormalParameters[~Yield, ~Await].
      // c. Let fallbackProto be "%Function.prototype%".
      fallbackProto = '%Function.prototype%';
    } else if (kind === 'generator') {
      // 8. Else if kind is generator, then
      // a. Let goal be the grammar symbol GeneratorBody.
      // b. Let parameterGoal be the grammar symbol FormalParameters[+Yield, ~Await].
      // c. Let fallbackProto be "%GeneratorFunction.prototype%".
      fallbackProto = '%GeneratorFunction.prototype%';
    } else if (kind === 'async') {
      // 9. Else if kind is async, then
      // a. Let goal be the grammar symbol AsyncFunctionBody.
      // b. Let parameterGoal be the grammar symbol FormalParameters[~Yield, +Await].
      // c. Let fallbackProto be "%AsyncFunction.prototype%".
      fallbackProto = '%AsyncFunction.prototype%';
    } else {
      // 10. Else,
      // a. Assert: kind is asyncGenerator.
      Assert(kind === 'asyncGenerator', "kind === 'asyncGenerator'"); // b. Let goal be the grammar symbol AsyncGeneratorBody.
      // c. Let parameterGoal be the grammar symbol FormalParameters[+Yield, +Await].
      // d. Let fallbackProto be "%AsyncGeneratorFunction.prototype%".

      fallbackProto = '%AsyncGeneratorFunction.prototype%';
    } // 11. Let argCount be the number of elements in args.


    const argCount = args.length; // 12. Let P be the empty String.

    let P = ''; // 13. If argCount = 0, let bodyArg be the empty String.

    let bodyArg;

    if (argCount === 0) {
      bodyArg = new Value('');
    } else if (argCount === 1) {
      // 14. Else if argCount = 1, let bodyArg be args[0].
      bodyArg = args[0];
    } else {
      // 15. Else,
      // a. Assert: argCount > 1.
      Assert(argCount > 1, "argCount > 1"); // b. Let firstArg be args[0].

      const firstArg = args[0]; // c. Set P to ? ToString(firstArg).

      let _temp2 = ToString(firstArg);

      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      P = _temp2.stringValue(); // d. Let k be 1.

      let k = 1; // e. Repeat, while k < argCount - 1

      while (k < argCount - 1) {
        // i. Let nextArg be args[k].
        const nextArg = args[k]; // ii. Let nextArgString be ? ToString(nextArg).

        let _temp3 = ToString(nextArg);

        if (_temp3 instanceof AbruptCompletion) {
          return _temp3;
        }

        if (_temp3 instanceof Completion) {
          _temp3 = _temp3.Value;
        }

        const nextArgString = _temp3; // iii. Set P to the string-concatenation of the previous value of P, "," (a comma), and nextArgString.

        P = `${P},${nextArgString.stringValue()}`; // iv. Set k to k + 1.

        k += 1;
      } // f. Let bodyArg be args[k].


      bodyArg = args[k];
    } // 16. Let bodyString be the string-concatenation of 0x000A (LINE FEED), ? ToString(bodyArg), and 0x000A (LINE FEED).


    let _temp4 = ToString(bodyArg);

    if (_temp4 instanceof AbruptCompletion) {
      return _temp4;
    }

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    const bodyString = `\u{000A}${_temp4.stringValue()}\u{000A}`; // 17. Let prefix be the prefix associated with kind in Table 48.

    const prefix = DynamicFunctionSourceTextPrefixes[kind]; // 18. Let sourceString be the string-concatenation of prefix, " anonymous(", P, 0x000A (LINE FEED), ") {", bodyString, and "}".

    const sourceString = `${prefix} anonymous(${P}\u{000A}) {${bodyString}}`; // 19. Let sourceText be ! UTF16DecodeString(sourceString).

    const sourceText = sourceString; // 20. Perform the following substeps in an implementation-dependent order, possibly interleaving parsing and error detection:
    //   a. Let parameters be the result of parsing ! UTF16DecodeString(P), using parameterGoal as the goal symbol. Throw a SyntaxError exception if the parse fails.
    //   b. Let body be the result of parsing ! UTF16DecodeString(bodyString), using goal as the goal symbol. Throw a SyntaxError exception if the parse fails.
    //   c. Let strict be ContainsUseStrict of body.
    //   d. If any static semantics errors are detected for parameters or body, throw a SyntaxError exception. If strict is true, the Early Error rules for UniqueFormalParameters:FormalParameters are applied.
    //   e. If strict is true and IsSimpleParameterList of parameters is false, throw a SyntaxError exception.
    //   f. If any element of the BoundNames of parameters also occurs in the LexicallyDeclaredNames of body, throw a SyntaxError exception.
    //   g. If body Contains SuperCall is true, throw a SyntaxError exception.
    //   h. If parameters Contains SuperCall is true, throw a SyntaxError exception.
    //   i. If body Contains SuperProperty is true, throw a SyntaxError exception.
    //   j. If parameters Contains SuperProperty is true, throw a SyntaxError exception.
    //   k. If kind is generator or asyncGenerator, then
    //     i. If parameters Contains YieldExpression is true, throw a SyntaxError exception.
    //   l. If kind is async or asyncGenerator, then
    //     i. If parameters Contains AwaitExpression is true, throw a SyntaxError exception.
    //   m. If strict is true, then
    //     i. If BoundNames of parameters contains any duplicate elements, throw a SyntaxError exception.

    let parameters;
    let body;
    {
      const f = wrappedParse({
        source: sourceString
      }, p => {
        const r = p.parseExpression();
        p.expect(Token.EOS);
        return r;
      });

      if (Array.isArray(f)) {
        return exports.surroundingAgent.Throw(f[0]);
      }

      parameters = f.FormalParameters;

      switch (kind) {
        case 'normal':
          body = f.FunctionBody;
          break;

        case 'generator':
          body = f.GeneratorBody;
          break;

        case 'async':
          body = f.AsyncFunctionBody;
          break;

        case 'asyncGenerator':
          body = f.AsyncGeneratorBody;
          break;

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('kind', kind);
      }
    } // 21. Let proto be ? GetPrototypeFromConstructor(newTarget, fallbackProto).

    let _temp5 = GetPrototypeFromConstructor(newTarget, fallbackProto);

    if (_temp5 instanceof AbruptCompletion) {
      return _temp5;
    }

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    const proto = _temp5; // 22. Let realmF be the current Realm Record.

    const realmF = exports.surroundingAgent.currentRealmRecord; // 23. Let scope be realmF.[[GlobalEnv]].

    const scope = realmF.GlobalEnv; // 24. Let F be ! OrdinaryFunctionCreate(proto, sourceText, parameters, body, non-lexical-this, scope).

    let _temp6 = OrdinaryFunctionCreate(proto, sourceText, parameters, body, 'non-lexical-this', scope);

    Assert(!(_temp6 instanceof AbruptCompletion), "OrdinaryFunctionCreate(proto, sourceText, parameters, body, 'non-lexical-this', scope)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp6 instanceof Completion) {
      _temp6 = _temp6.Value;
    }

    const F = _temp6; // 25. Perform SetFunctionName(F, "anonymous").

    SetFunctionName(F, new Value('anonymous')); // 26. If kind is generator, then

    if (kind === 'generator') {
      // a. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).
      const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%')); // b. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

      DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
        Value: prototype,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.false
      }));
    } else if (kind === 'asyncGenerator') {
      // 27. Else if kind is asyncGenerator, then
      // a. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).
      const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%')); // b. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

      DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
        Value: prototype,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.false
      }));
    } else if (kind === 'normal') {
      // 28. Else if kind is normal, then perform MakeConstructor(F).
      MakeConstructor(F);
    } // 29. NOTE: Functions whose kind is async are not constructible and do not have a [[Construct]] internal method or a "prototype" property.
    // 20. Return F.


    return F;
  }

  //   GeneratorExpression :
  //     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
  //     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`

  function* Evaluate_GeneratorExpression(GeneratorExpression) {
    const {
      BindingIdentifier,
      FormalParameters,
      GeneratorBody
    } = GeneratorExpression;

    if (!BindingIdentifier) {
      // 1. Return the result of performing NamedEvaluation for this GeneratorExpression with argument "".
      return yield* NamedEvaluation(GeneratorExpression, new Value(''));
    } // 1. Let scope be the running execution context's LexicalEnvironment.


    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let funcEnv be NewDeclarativeEnvironment(scope).

    const funcEnv = NewDeclarativeEnvironment(scope); // 3. Let name be StringValue of BindingIdentifier.

    const name = StringValue(BindingIdentifier); // 4. Perform funcEnv.CreateImmutableBinding(name, false).

    funcEnv.CreateImmutableBinding(name, Value.false); // 5. Let sourceText be the source text matched by GeneratorExpression.

    const sourceText = sourceTextMatchedBy(GeneratorExpression); // 6. Let closure be OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, funcEnv).

    let _temp = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', funcEnv);

    Assert(!(_temp instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', funcEnv)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const closure = _temp; // 7. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 8. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).

    const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%')); // 9. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    let _temp2 = DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    }));

    Assert(!(_temp2 instanceof AbruptCompletion), "DefinePropertyOrThrow(\n    closure,\n    new Value('prototype'),\n    Descriptor({\n      Value: prototype,\n      Writable: Value.true,\n      Enumerable: Value.false,\n      Configurable: Value.false,\n    }),\n  )" + ' returned an abrupt completion');

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    funcEnv.InitializeBinding(name, closure); // 11. Return closure.

    return closure;
  }

  function Evaluate_ArrowFunction(ArrowFunction) {
    // 1. Return the result of performing NamedEvaluation for this ArrowFunction with argument "".
    return NamedEvaluation(ArrowFunction, new Value(''));
  }

  function Evaluate_AsyncArrowFunction(AsyncArrowFunction) {
    // 1. Return the result of performing NamedEvaluation for this ArrowFunction with argument "".
    return NamedEvaluation(AsyncArrowFunction, new Value(''));
  }

  //   BreakStatement :
  //     `break` `;`
  //     `break` LabelIdentifier `;`

  function Evaluate_BreakStatement({
    LabelIdentifier
  }) {
    if (!LabelIdentifier) {
      // 1. Return Completion { [[Type]]: break, [[Value]]: empty, [[Target]]: empty }.
      return new Completion({
        Type: 'break',
        Value: undefined,
        Target: undefined
      });
    } // 1. Let label be the StringValue of LabelIdentifier.


    const label = StringValue(LabelIdentifier); // 2. Return Completion { [[Type]]: break, [[Value]]: empty, [[Target]]: label }.

    return new Completion({
      Type: 'break',
      Value: undefined,
      Target: label
    });
  }

  //   AsyncGeneratorExpression :
  //     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  //     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`

  function* Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression) {
    const {
      BindingIdentifier,
      FormalParameters,
      AsyncGeneratorBody
    } = AsyncGeneratorExpression;

    if (!BindingIdentifier) {
      // 1. Return the result of performing NamedEvaluation for this AsyncGeneratorExpression with argument "".
      return yield* NamedEvaluation(AsyncGeneratorExpression, new Value(''));
    } // 1. Let scope be the running execution context's LexicalEnvironment.


    const scope = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 2. Let funcEnv be NewDeclarativeEnvironment(scope).

    const funcEnv = NewDeclarativeEnvironment(scope); // 3. Let name be StringValue of BindingIdentifier.

    const name = StringValue(BindingIdentifier); // 4. Perform funcEnv.CreateImmutableBinding(name, false).

    funcEnv.CreateImmutableBinding(name, Value.false); // 5. Let source text be the source textmatched by AsyncGeneratorExpression.

    const sourceText = sourceTextMatchedBy(AsyncGeneratorExpression); // 6. Let closure be OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, FormalParameters, AsyncGeneratorBody, non-lexical-this, funcEnv).

    let _temp = OrdinaryFunctionCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', funcEnv);

    Assert(!(_temp instanceof AbruptCompletion), "OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', funcEnv)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const closure = _temp; // 7. Perform SetFunctionName(closure, name).

    SetFunctionName(closure, name); // 8. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).

    const prototype = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%')); // 9. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).

    let _temp2 = DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false
    }));

    Assert(!(_temp2 instanceof AbruptCompletion), "DefinePropertyOrThrow(\n    closure,\n    new Value('prototype'),\n    Descriptor({\n      Value: prototype,\n      Writable: Value.true,\n      Enumerable: Value.false,\n      Configurable: Value.false,\n    }),\n  )" + ' returned an abrupt completion');

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    funcEnv.InitializeBinding(name, closure); // 11. Return closure.

    return closure;
  }

  //   HoistableDeclaration :
  //     GeneratorDeclaration
  //     AsyncFunctionDeclaration
  //     AsyncGeneratorDeclaration

  function Evaluate_HoistableDeclaration(_HoistableDeclaration) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  //   Expression :
  //     AssignmentExpression
  //     Expression `,` AssignmentExpression

  function* Evaluate_CommaOperator({
    ExpressionList
  }) {
    let result;

    for (const Expression of ExpressionList) {
      const lref = yield* Evaluate(Expression);

      let _temp = GetValue(lref);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      result = _temp;
    }

    return result;
  }

  //   YieldExpression :
  //     `yield`
  //     `yield` AssignmentExpression
  //     `yield` `*` AssignmentExpression

  function* Evaluate_YieldExpression({
    hasStar,
    AssignmentExpression
  }) {
    let _temp = GetGeneratorKind();

    Assert(!(_temp instanceof AbruptCompletion), "GetGeneratorKind()" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    // 1. Let generatorKind be ! GetGeneratorKind().
    const generatorKind = _temp;

    if (hasStar) {
      // 2. Let exprRef be the result of evaluating AssignmentExpression.
      const exprRef = yield* Evaluate(AssignmentExpression); // 3. Let value be ? GetValue(exprRef).

      let _temp2 = GetValue(exprRef);
      /* istanbul ignore if */


      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }
      /* istanbul ignore if */


      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      const value = _temp2; // 4. Let iteratorRecord be ? GetIterator(value, generatorKind).

      let _temp3 = GetIterator(value, generatorKind);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      const iteratorRecord = _temp3; // 5. Let iterator be iteratorRecord.[[Iterator]].

      const iterator = iteratorRecord.Iterator; // 6. Let received be NormalCompletion(undefined).

      let received = NormalCompletion(Value.undefined); // 7. Repeat,

      while (true) {
        // a. If received.[[Type]] is normal, then
        if (received.Type === 'normal') {
          let _temp4 = Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [received.Value]);

          if (_temp4 instanceof AbruptCompletion) {
            return _temp4;
          }

          if (_temp4 instanceof Completion) {
            _temp4 = _temp4.Value;
          }

          // i. Let innerResult be ? Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]], « received.[[Value]] »).
          let innerResult = _temp4; // ii. If generatorKind is async, then set innerResult to ? Await(innerResult).

          if (generatorKind === 'async') {
            let _temp5 = yield* Await(innerResult);

            if (_temp5 instanceof AbruptCompletion) {
              return _temp5;
            }

            if (_temp5 instanceof Completion) {
              _temp5 = _temp5.Value;
            }

            innerResult = _temp5;
          } // iii. If Type(innerResult) is not Object, throw a TypeError exception.


          if (Type(innerResult) !== 'Object') {
            return exports.surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult);
          } // iv. Let done be ? IteratorComplete(innerResult).


          let _temp6 = IteratorComplete(innerResult);

          if (_temp6 instanceof AbruptCompletion) {
            return _temp6;
          }

          if (_temp6 instanceof Completion) {
            _temp6 = _temp6.Value;
          }

          const done = _temp6; // v. If done is true, then

          if (done === Value.true) {
            // 1. Return ? IteratorValue(innerResult).
            return IteratorValue(innerResult);
          } // vi. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).


          if (generatorKind === 'async') {
            let _temp7 = IteratorValue(innerResult);

            if (_temp7 instanceof AbruptCompletion) {
              return _temp7;
            }

            if (_temp7 instanceof Completion) {
              _temp7 = _temp7.Value;
            }

            received = yield* AsyncGeneratorYield(_temp7);
          } else {
            // vii. Else, set received to GeneratorYield(innerResult).
            received = yield* GeneratorYield(innerResult);
          }
        } else if (received.Type === 'throw') {
          let _temp8 = GetMethod(iterator, new Value('throw'));

          if (_temp8 instanceof AbruptCompletion) {
            return _temp8;
          }

          if (_temp8 instanceof Completion) {
            _temp8 = _temp8.Value;
          }

          // b. Else if received.[[Type]] is throw, then
          // i. Let throw be ? GetMethod(iterator, "throw").
          const thr = _temp8; // ii. If throw is not undefined, then

          if (thr !== Value.undefined) {
            let _temp9 = Call(thr, iterator, [received.Value]);

            if (_temp9 instanceof AbruptCompletion) {
              return _temp9;
            }

            if (_temp9 instanceof Completion) {
              _temp9 = _temp9.Value;
            }

            // 1. Let innerResult be ? Call(throw, iterator, « received.[[Value]] »).
            let innerResult = _temp9; // 2. If generatorKind is async, then set innerResult to ? Await(innerResult).

            if (generatorKind === 'async') {
              let _temp10 = yield* Await(innerResult);

              if (_temp10 instanceof AbruptCompletion) {
                return _temp10;
              }

              if (_temp10 instanceof Completion) {
                _temp10 = _temp10.Value;
              }

              innerResult = _temp10;
            } // 3. NOTE: Exceptions from the inner iterator throw method are propagated. Normal completions from an inner throw method are processed similarly to an inner next.
            // 4. If Type(innerResult) is not Object, throw a TypeError exception.


            if (Type(innerResult) !== 'Object') {
              return exports.surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult);
            } // 5. Let done be ? IteratorComplete(innerResult).


            let _temp11 = IteratorComplete(innerResult);

            if (_temp11 instanceof AbruptCompletion) {
              return _temp11;
            }

            if (_temp11 instanceof Completion) {
              _temp11 = _temp11.Value;
            }

            const done = _temp11; // 6. If done is true, then

            if (done === Value.true) {
              // a. Return ? IteratorValue(innerResult).
              return IteratorValue(innerResult);
            } // 7. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).


            if (generatorKind === 'async') {
              let _temp12 = IteratorValue(innerResult);

              if (_temp12 instanceof AbruptCompletion) {
                return _temp12;
              }

              if (_temp12 instanceof Completion) {
                _temp12 = _temp12.Value;
              }

              received = yield* AsyncGeneratorYield(_temp12);
            } else {
              // 8. Else, set received to GeneratorYield(innerResult).
              received = yield* GeneratorYield(innerResult);
            }
          } else {
            // iii. Else,
            // 1. NOTE: If iterator does not have a throw method, this throw is going to terminate the yield* loop. But first we need to give iterator a chance to clean up.
            // 2. Let closeCompletion be Completion { [[Type]]: normal, [[Value]]: empty, [[Target]]: empty }.
            const closeCompletion = NormalCompletion(undefined); // 3. If generatorKind is async, perform ? AsyncIteratorClose(iteratorRecord, closeCompletion).
            // 4. Else, perform ? IteratorClose(iteratorRecord, closeCompletion).

            if (generatorKind === 'async') {
              let _temp13 = yield* AsyncIteratorClose(iteratorRecord, closeCompletion);

              if (_temp13 instanceof AbruptCompletion) {
                return _temp13;
              }

              if (_temp13 instanceof Completion) {
                _temp13 = _temp13.Value;
              }
            } else {
              let _temp14 = IteratorClose(iteratorRecord, closeCompletion);

              if (_temp14 instanceof AbruptCompletion) {
                return _temp14;
              }

              if (_temp14 instanceof Completion) {
                _temp14 = _temp14.Value;
              }
            } // 5. NOTE: The next step throws a TypeError to indicate that there was a yield* protocol violation: iterator does not have a throw method.
            // 6. Throw a TypeError exception.


            return exports.surroundingAgent.Throw('TypeError', 'IteratorThrowMissing');
          }
        } else {
          // c. Else,
          // i. Assert: received.[[Type]] is return.
          Assert(received.Type === 'return', "received.Type === 'return'"); // ii. Let return be ? GetMethod(iterator, "return").

          let _temp15 = GetMethod(iterator, new Value('return'));

          if (_temp15 instanceof AbruptCompletion) {
            return _temp15;
          }

          if (_temp15 instanceof Completion) {
            _temp15 = _temp15.Value;
          }

          const ret = _temp15; // iii. If return is undefined, then

          if (ret === Value.undefined) {
            // 1. If generatorKind is async, then set received.[[Value]] to ? Await(received.[[Value]]).
            if (generatorKind === 'async') {
              let _temp16 = yield* Await(received.Value);

              if (_temp16 instanceof AbruptCompletion) {
                return _temp16;
              }

              if (_temp16 instanceof Completion) {
                _temp16 = _temp16.Value;
              }

              received.Value = _temp16;
            } // 2. Return Completion(received).


            return Completion(received);
          } // iv. Let innerReturnResult be ? Call(return, iterator, « received.[[Value]] »).


          let _temp17 = Call(ret, iterator, [received.Value]);

          if (_temp17 instanceof AbruptCompletion) {
            return _temp17;
          }

          if (_temp17 instanceof Completion) {
            _temp17 = _temp17.Value;
          }

          let innerReturnResult = _temp17; // v. If generatorKind is async, then set innerReturnResult to ? Await(innerReturnResult).

          if (generatorKind === 'async') {
            let _temp18 = yield* Await(innerReturnResult);

            if (_temp18 instanceof AbruptCompletion) {
              return _temp18;
            }

            if (_temp18 instanceof Completion) {
              _temp18 = _temp18.Value;
            }

            innerReturnResult = _temp18;
          } // vi. If Type(innerReturnResult) is not Object, throw a TypeError exception.


          if (Type(innerReturnResult) !== 'Object') {
            return exports.surroundingAgent.Throw('TypeError', 'NotAnObject', innerReturnResult);
          } // vii. Let done be ? IteratorComplete(innerReturnResult).


          let _temp19 = IteratorComplete(innerReturnResult);

          if (_temp19 instanceof AbruptCompletion) {
            return _temp19;
          }

          if (_temp19 instanceof Completion) {
            _temp19 = _temp19.Value;
          }

          const done = _temp19; // viii. If done is true, then

          if (done === Value.true) {
            let _temp20 = IteratorValue(innerReturnResult);

            if (_temp20 instanceof AbruptCompletion) {
              return _temp20;
            }

            if (_temp20 instanceof Completion) {
              _temp20 = _temp20.Value;
            }

            // 1. Let value be ? IteratorValue(innerReturnResult).
            const innerValue = _temp20; // 2. Return Completion { [[Type]]: return, [[Value]]: value, [[Target]]: empty }.

            return new Completion({
              Type: 'return',
              Value: innerValue,
              Target: undefined
            });
          } // ix. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).


          if (generatorKind === 'async') {
            let _temp21 = IteratorValue(innerReturnResult);

            if (_temp21 instanceof AbruptCompletion) {
              return _temp21;
            }

            if (_temp21 instanceof Completion) {
              _temp21 = _temp21.Value;
            }

            received = yield* AsyncGeneratorYield(_temp21);
          } else {
            // ixx. Else, set received to GeneratorYield(innerResult).
            received = yield* GeneratorYield(innerReturnResult);
          }
        }

        received = EnsureCompletion(received);
      }
    }

    if (AssignmentExpression) {
      // 2. Let exprRef be the result of evaluating AssignmentExpression.
      const exprRef = yield* Evaluate(AssignmentExpression); // 3. Let value be ? GetValue(exprRef).

      let _temp22 = GetValue(exprRef);

      if (_temp22 instanceof AbruptCompletion) {
        return _temp22;
      }

      if (_temp22 instanceof Completion) {
        _temp22 = _temp22.Value;
      }

      const value = _temp22; // 4. If generatorKind is async, then return ? AsyncGeneratorYield(value).

      if (generatorKind === 'async') {
        return yield* AsyncGeneratorYield(value);
      } // 5. Otherwise, return ? GeneratorYield(CreateIterResultObject(value, false)).


      return yield* GeneratorYield(CreateIterResultObject(value, Value.false));
    } // 2. If generatorKind is async, then return ? AsyncGeneratorYield(undefined).


    if (generatorKind === 'async') {
      return yield* AsyncGeneratorYield(Value.undefined);
    } // 3. Otherwise, return ? GeneratorYield(CreateIterResultObject(undefined, false)).


    return yield* GeneratorYield(CreateIterResultObject(Value.undefined, Value.false));
  }

  function StringIndexOf(string, searchValue, fromIndex) {
    // 1. Assert: Type(string) is String.
    Assert(Type(string) === 'String', "Type(string) === 'String'"); // 2. Assert: Type(searchValue) is String.

    Assert(Type(searchValue) === 'String', "Type(searchValue) === 'String'"); // 3. Assert: fromIndex is a nonnegative integer.

    Assert(Number.isInteger(fromIndex) && fromIndex >= 0, "Number.isInteger(fromIndex) && fromIndex >= 0");
    const stringStr = string.stringValue();
    const searchStr = searchValue.stringValue(); // 4. Let len be the length of string.

    const len = stringStr.length; // 5. If searchValue is the empty string, and fromIndex <= len, return fromIndex.

    if (searchStr === '' && fromIndex <= len) {
      return new Value(fromIndex);
    } // 6. Let searchLen be the length of searchValue.


    const searchLen = searchStr.length; // 7. If there exists any integer k such that fromIndex ≤ k ≤ len - searchLen and for all nonnegative integers j less than searchLen,
    //    the code unit at index k + j within string is the same as the code unit at index j within searchValue, let pos be the smallest (closest to -∞) such integer.
    //    Otherwise, let pos be -1.

    let k = fromIndex;
    let pos = -1;

    while (k + searchLen <= len) {
      let match = true;

      for (let j = 0; j < searchLen; j += 1) {
        if (searchStr[j] !== stringStr[k + j]) {
          match = false;
          break;
        }
      }

      if (match) {
        pos = k;
        break;
      }

      k += 1;
    } // 8. Return pos.


    return new Value(pos);
  }

  function NumberToBigInt(number) {
    // 1. Assert: Type(number) is Number.
    Assert(Type(number) === 'Number', "Type(number) === 'Number'"); // 2. If IsInteger(number) is false, throw a RangeError exception.

    if (IsInteger(number) === Value.false) {
      return exports.surroundingAgent.Throw('RangeError', 'CannotConvertDecimalToBigInt', number);
    } // 3. Return the BigInt value that represents the mathematical value of number.


    return new Value(BigInt(number.numberValue()));
  }

  //   ConditionalExpression :
  //     ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression

  function* Evaluate_ConditionalExpression({
    ShortCircuitExpression,
    AssignmentExpression_a,
    AssignmentExpression_b
  }) {
    // 1. Let lref be the result of evaluating ShortCircuitExpression.
    const lref = yield* Evaluate(ShortCircuitExpression); // 2. Let lval be ! ToBoolean(? GetValue(lref)).

    let _temp2 = GetValue(lref);
    /* istanbul ignore if */


    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }
    /* istanbul ignore if */


    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    let _temp = ToBoolean(_temp2);

    Assert(!(_temp instanceof AbruptCompletion), "ToBoolean(Q(GetValue(lref)))" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const lval = _temp; // 3. If lval is true, then

    if (lval === Value.true) {
      // a. Let trueRef be the result of evaluating the first AssignmentExpression.
      const trueRef = yield* Evaluate(AssignmentExpression_a); // b. Return ? GetValue(trueRef).

      return GetValue(trueRef);
    } else {
      // 4. Else,
      // a. Let falseRef be the result of evaluating the second AssignmentExpression.
      const falseRef = yield* Evaluate(AssignmentExpression_b); // b. Return ? GetValue(falseRef).

      return GetValue(falseRef);
    }
  }

  //   RegularExpressionLiteral :
  //     `/` RegularExpressionBody `/` RegularExpressionFlags

  function Evaluate_RegularExpressionLiteral(RegularExpressionLiteral) {
    // 1. Let pattern be ! UTF16Encode(BodyText of RegularExpressionLiteral).
    const pattern = new Value(BodyText(RegularExpressionLiteral)); // 2. Let flags be ! UTF16Encode(FlagText of RegularExpressionLiteral).

    const flags = new Value(FlagText(RegularExpressionLiteral)); // 3. Return RegExpCreate(pattern, flags).

    return RegExpCreate(pattern, flags);
  }

  var symbols=new Map([['A','a'],['B','b'],['C','c'],['D','d'],['E','e'],['F','f'],['G','g'],['H','h'],['I','i'],['J','j'],['K','k'],['L','l'],['M','m'],['N','n'],['O','o'],['P','p'],['Q','q'],['R','r'],['S','s'],['T','t'],['U','u'],['V','v'],['W','w'],['X','x'],['Y','y'],['Z','z'],['\xB5','\u03BC'],['\xC0','\xE0'],['\xC1','\xE1'],['\xC2','\xE2'],['\xC3','\xE3'],['\xC4','\xE4'],['\xC5','\xE5'],['\xC6','\xE6'],['\xC7','\xE7'],['\xC8','\xE8'],['\xC9','\xE9'],['\xCA','\xEA'],['\xCB','\xEB'],['\xCC','\xEC'],['\xCD','\xED'],['\xCE','\xEE'],['\xCF','\xEF'],['\xD0','\xF0'],['\xD1','\xF1'],['\xD2','\xF2'],['\xD3','\xF3'],['\xD4','\xF4'],['\xD5','\xF5'],['\xD6','\xF6'],['\xD8','\xF8'],['\xD9','\xF9'],['\xDA','\xFA'],['\xDB','\xFB'],['\xDC','\xFC'],['\xDD','\xFD'],['\xDE','\xFE'],['\u0100','\u0101'],['\u0102','\u0103'],['\u0104','\u0105'],['\u0106','\u0107'],['\u0108','\u0109'],['\u010A','\u010B'],['\u010C','\u010D'],['\u010E','\u010F'],['\u0110','\u0111'],['\u0112','\u0113'],['\u0114','\u0115'],['\u0116','\u0117'],['\u0118','\u0119'],['\u011A','\u011B'],['\u011C','\u011D'],['\u011E','\u011F'],['\u0120','\u0121'],['\u0122','\u0123'],['\u0124','\u0125'],['\u0126','\u0127'],['\u0128','\u0129'],['\u012A','\u012B'],['\u012C','\u012D'],['\u012E','\u012F'],['\u0132','\u0133'],['\u0134','\u0135'],['\u0136','\u0137'],['\u0139','\u013A'],['\u013B','\u013C'],['\u013D','\u013E'],['\u013F','\u0140'],['\u0141','\u0142'],['\u0143','\u0144'],['\u0145','\u0146'],['\u0147','\u0148'],['\u014A','\u014B'],['\u014C','\u014D'],['\u014E','\u014F'],['\u0150','\u0151'],['\u0152','\u0153'],['\u0154','\u0155'],['\u0156','\u0157'],['\u0158','\u0159'],['\u015A','\u015B'],['\u015C','\u015D'],['\u015E','\u015F'],['\u0160','\u0161'],['\u0162','\u0163'],['\u0164','\u0165'],['\u0166','\u0167'],['\u0168','\u0169'],['\u016A','\u016B'],['\u016C','\u016D'],['\u016E','\u016F'],['\u0170','\u0171'],['\u0172','\u0173'],['\u0174','\u0175'],['\u0176','\u0177'],['\u0178','\xFF'],['\u0179','\u017A'],['\u017B','\u017C'],['\u017D','\u017E'],['\u017F','s'],['\u0181','\u0253'],['\u0182','\u0183'],['\u0184','\u0185'],['\u0186','\u0254'],['\u0187','\u0188'],['\u0189','\u0256'],['\u018A','\u0257'],['\u018B','\u018C'],['\u018E','\u01DD'],['\u018F','\u0259'],['\u0190','\u025B'],['\u0191','\u0192'],['\u0193','\u0260'],['\u0194','\u0263'],['\u0196','\u0269'],['\u0197','\u0268'],['\u0198','\u0199'],['\u019C','\u026F'],['\u019D','\u0272'],['\u019F','\u0275'],['\u01A0','\u01A1'],['\u01A2','\u01A3'],['\u01A4','\u01A5'],['\u01A6','\u0280'],['\u01A7','\u01A8'],['\u01A9','\u0283'],['\u01AC','\u01AD'],['\u01AE','\u0288'],['\u01AF','\u01B0'],['\u01B1','\u028A'],['\u01B2','\u028B'],['\u01B3','\u01B4'],['\u01B5','\u01B6'],['\u01B7','\u0292'],['\u01B8','\u01B9'],['\u01BC','\u01BD'],['\u01C4','\u01C6'],['\u01C5','\u01C6'],['\u01C7','\u01C9'],['\u01C8','\u01C9'],['\u01CA','\u01CC'],['\u01CB','\u01CC'],['\u01CD','\u01CE'],['\u01CF','\u01D0'],['\u01D1','\u01D2'],['\u01D3','\u01D4'],['\u01D5','\u01D6'],['\u01D7','\u01D8'],['\u01D9','\u01DA'],['\u01DB','\u01DC'],['\u01DE','\u01DF'],['\u01E0','\u01E1'],['\u01E2','\u01E3'],['\u01E4','\u01E5'],['\u01E6','\u01E7'],['\u01E8','\u01E9'],['\u01EA','\u01EB'],['\u01EC','\u01ED'],['\u01EE','\u01EF'],['\u01F1','\u01F3'],['\u01F2','\u01F3'],['\u01F4','\u01F5'],['\u01F6','\u0195'],['\u01F7','\u01BF'],['\u01F8','\u01F9'],['\u01FA','\u01FB'],['\u01FC','\u01FD'],['\u01FE','\u01FF'],['\u0200','\u0201'],['\u0202','\u0203'],['\u0204','\u0205'],['\u0206','\u0207'],['\u0208','\u0209'],['\u020A','\u020B'],['\u020C','\u020D'],['\u020E','\u020F'],['\u0210','\u0211'],['\u0212','\u0213'],['\u0214','\u0215'],['\u0216','\u0217'],['\u0218','\u0219'],['\u021A','\u021B'],['\u021C','\u021D'],['\u021E','\u021F'],['\u0220','\u019E'],['\u0222','\u0223'],['\u0224','\u0225'],['\u0226','\u0227'],['\u0228','\u0229'],['\u022A','\u022B'],['\u022C','\u022D'],['\u022E','\u022F'],['\u0230','\u0231'],['\u0232','\u0233'],['\u023A','\u2C65'],['\u023B','\u023C'],['\u023D','\u019A'],['\u023E','\u2C66'],['\u0241','\u0242'],['\u0243','\u0180'],['\u0244','\u0289'],['\u0245','\u028C'],['\u0246','\u0247'],['\u0248','\u0249'],['\u024A','\u024B'],['\u024C','\u024D'],['\u024E','\u024F'],['\u0345','\u03B9'],['\u0370','\u0371'],['\u0372','\u0373'],['\u0376','\u0377'],['\u037F','\u03F3'],['\u0386','\u03AC'],['\u0388','\u03AD'],['\u0389','\u03AE'],['\u038A','\u03AF'],['\u038C','\u03CC'],['\u038E','\u03CD'],['\u038F','\u03CE'],['\u0391','\u03B1'],['\u0392','\u03B2'],['\u0393','\u03B3'],['\u0394','\u03B4'],['\u0395','\u03B5'],['\u0396','\u03B6'],['\u0397','\u03B7'],['\u0398','\u03B8'],['\u0399','\u03B9'],['\u039A','\u03BA'],['\u039B','\u03BB'],['\u039C','\u03BC'],['\u039D','\u03BD'],['\u039E','\u03BE'],['\u039F','\u03BF'],['\u03A0','\u03C0'],['\u03A1','\u03C1'],['\u03A3','\u03C3'],['\u03A4','\u03C4'],['\u03A5','\u03C5'],['\u03A6','\u03C6'],['\u03A7','\u03C7'],['\u03A8','\u03C8'],['\u03A9','\u03C9'],['\u03AA','\u03CA'],['\u03AB','\u03CB'],['\u03C2','\u03C3'],['\u03CF','\u03D7'],['\u03D0','\u03B2'],['\u03D1','\u03B8'],['\u03D5','\u03C6'],['\u03D6','\u03C0'],['\u03D8','\u03D9'],['\u03DA','\u03DB'],['\u03DC','\u03DD'],['\u03DE','\u03DF'],['\u03E0','\u03E1'],['\u03E2','\u03E3'],['\u03E4','\u03E5'],['\u03E6','\u03E7'],['\u03E8','\u03E9'],['\u03EA','\u03EB'],['\u03EC','\u03ED'],['\u03EE','\u03EF'],['\u03F0','\u03BA'],['\u03F1','\u03C1'],['\u03F4','\u03B8'],['\u03F5','\u03B5'],['\u03F7','\u03F8'],['\u03F9','\u03F2'],['\u03FA','\u03FB'],['\u03FD','\u037B'],['\u03FE','\u037C'],['\u03FF','\u037D'],['\u0400','\u0450'],['\u0401','\u0451'],['\u0402','\u0452'],['\u0403','\u0453'],['\u0404','\u0454'],['\u0405','\u0455'],['\u0406','\u0456'],['\u0407','\u0457'],['\u0408','\u0458'],['\u0409','\u0459'],['\u040A','\u045A'],['\u040B','\u045B'],['\u040C','\u045C'],['\u040D','\u045D'],['\u040E','\u045E'],['\u040F','\u045F'],['\u0410','\u0430'],['\u0411','\u0431'],['\u0412','\u0432'],['\u0413','\u0433'],['\u0414','\u0434'],['\u0415','\u0435'],['\u0416','\u0436'],['\u0417','\u0437'],['\u0418','\u0438'],['\u0419','\u0439'],['\u041A','\u043A'],['\u041B','\u043B'],['\u041C','\u043C'],['\u041D','\u043D'],['\u041E','\u043E'],['\u041F','\u043F'],['\u0420','\u0440'],['\u0421','\u0441'],['\u0422','\u0442'],['\u0423','\u0443'],['\u0424','\u0444'],['\u0425','\u0445'],['\u0426','\u0446'],['\u0427','\u0447'],['\u0428','\u0448'],['\u0429','\u0449'],['\u042A','\u044A'],['\u042B','\u044B'],['\u042C','\u044C'],['\u042D','\u044D'],['\u042E','\u044E'],['\u042F','\u044F'],['\u0460','\u0461'],['\u0462','\u0463'],['\u0464','\u0465'],['\u0466','\u0467'],['\u0468','\u0469'],['\u046A','\u046B'],['\u046C','\u046D'],['\u046E','\u046F'],['\u0470','\u0471'],['\u0472','\u0473'],['\u0474','\u0475'],['\u0476','\u0477'],['\u0478','\u0479'],['\u047A','\u047B'],['\u047C','\u047D'],['\u047E','\u047F'],['\u0480','\u0481'],['\u048A','\u048B'],['\u048C','\u048D'],['\u048E','\u048F'],['\u0490','\u0491'],['\u0492','\u0493'],['\u0494','\u0495'],['\u0496','\u0497'],['\u0498','\u0499'],['\u049A','\u049B'],['\u049C','\u049D'],['\u049E','\u049F'],['\u04A0','\u04A1'],['\u04A2','\u04A3'],['\u04A4','\u04A5'],['\u04A6','\u04A7'],['\u04A8','\u04A9'],['\u04AA','\u04AB'],['\u04AC','\u04AD'],['\u04AE','\u04AF'],['\u04B0','\u04B1'],['\u04B2','\u04B3'],['\u04B4','\u04B5'],['\u04B6','\u04B7'],['\u04B8','\u04B9'],['\u04BA','\u04BB'],['\u04BC','\u04BD'],['\u04BE','\u04BF'],['\u04C0','\u04CF'],['\u04C1','\u04C2'],['\u04C3','\u04C4'],['\u04C5','\u04C6'],['\u04C7','\u04C8'],['\u04C9','\u04CA'],['\u04CB','\u04CC'],['\u04CD','\u04CE'],['\u04D0','\u04D1'],['\u04D2','\u04D3'],['\u04D4','\u04D5'],['\u04D6','\u04D7'],['\u04D8','\u04D9'],['\u04DA','\u04DB'],['\u04DC','\u04DD'],['\u04DE','\u04DF'],['\u04E0','\u04E1'],['\u04E2','\u04E3'],['\u04E4','\u04E5'],['\u04E6','\u04E7'],['\u04E8','\u04E9'],['\u04EA','\u04EB'],['\u04EC','\u04ED'],['\u04EE','\u04EF'],['\u04F0','\u04F1'],['\u04F2','\u04F3'],['\u04F4','\u04F5'],['\u04F6','\u04F7'],['\u04F8','\u04F9'],['\u04FA','\u04FB'],['\u04FC','\u04FD'],['\u04FE','\u04FF'],['\u0500','\u0501'],['\u0502','\u0503'],['\u0504','\u0505'],['\u0506','\u0507'],['\u0508','\u0509'],['\u050A','\u050B'],['\u050C','\u050D'],['\u050E','\u050F'],['\u0510','\u0511'],['\u0512','\u0513'],['\u0514','\u0515'],['\u0516','\u0517'],['\u0518','\u0519'],['\u051A','\u051B'],['\u051C','\u051D'],['\u051E','\u051F'],['\u0520','\u0521'],['\u0522','\u0523'],['\u0524','\u0525'],['\u0526','\u0527'],['\u0528','\u0529'],['\u052A','\u052B'],['\u052C','\u052D'],['\u052E','\u052F'],['\u0531','\u0561'],['\u0532','\u0562'],['\u0533','\u0563'],['\u0534','\u0564'],['\u0535','\u0565'],['\u0536','\u0566'],['\u0537','\u0567'],['\u0538','\u0568'],['\u0539','\u0569'],['\u053A','\u056A'],['\u053B','\u056B'],['\u053C','\u056C'],['\u053D','\u056D'],['\u053E','\u056E'],['\u053F','\u056F'],['\u0540','\u0570'],['\u0541','\u0571'],['\u0542','\u0572'],['\u0543','\u0573'],['\u0544','\u0574'],['\u0545','\u0575'],['\u0546','\u0576'],['\u0547','\u0577'],['\u0548','\u0578'],['\u0549','\u0579'],['\u054A','\u057A'],['\u054B','\u057B'],['\u054C','\u057C'],['\u054D','\u057D'],['\u054E','\u057E'],['\u054F','\u057F'],['\u0550','\u0580'],['\u0551','\u0581'],['\u0552','\u0582'],['\u0553','\u0583'],['\u0554','\u0584'],['\u0555','\u0585'],['\u0556','\u0586'],['\u10A0','\u2D00'],['\u10A1','\u2D01'],['\u10A2','\u2D02'],['\u10A3','\u2D03'],['\u10A4','\u2D04'],['\u10A5','\u2D05'],['\u10A6','\u2D06'],['\u10A7','\u2D07'],['\u10A8','\u2D08'],['\u10A9','\u2D09'],['\u10AA','\u2D0A'],['\u10AB','\u2D0B'],['\u10AC','\u2D0C'],['\u10AD','\u2D0D'],['\u10AE','\u2D0E'],['\u10AF','\u2D0F'],['\u10B0','\u2D10'],['\u10B1','\u2D11'],['\u10B2','\u2D12'],['\u10B3','\u2D13'],['\u10B4','\u2D14'],['\u10B5','\u2D15'],['\u10B6','\u2D16'],['\u10B7','\u2D17'],['\u10B8','\u2D18'],['\u10B9','\u2D19'],['\u10BA','\u2D1A'],['\u10BB','\u2D1B'],['\u10BC','\u2D1C'],['\u10BD','\u2D1D'],['\u10BE','\u2D1E'],['\u10BF','\u2D1F'],['\u10C0','\u2D20'],['\u10C1','\u2D21'],['\u10C2','\u2D22'],['\u10C3','\u2D23'],['\u10C4','\u2D24'],['\u10C5','\u2D25'],['\u10C7','\u2D27'],['\u10CD','\u2D2D'],['\u13F8','\u13F0'],['\u13F9','\u13F1'],['\u13FA','\u13F2'],['\u13FB','\u13F3'],['\u13FC','\u13F4'],['\u13FD','\u13F5'],['\u1C80','\u0432'],['\u1C81','\u0434'],['\u1C82','\u043E'],['\u1C83','\u0441'],['\u1C84','\u0442'],['\u1C85','\u0442'],['\u1C86','\u044A'],['\u1C87','\u0463'],['\u1C88','\uA64B'],['\u1C90','\u10D0'],['\u1C91','\u10D1'],['\u1C92','\u10D2'],['\u1C93','\u10D3'],['\u1C94','\u10D4'],['\u1C95','\u10D5'],['\u1C96','\u10D6'],['\u1C97','\u10D7'],['\u1C98','\u10D8'],['\u1C99','\u10D9'],['\u1C9A','\u10DA'],['\u1C9B','\u10DB'],['\u1C9C','\u10DC'],['\u1C9D','\u10DD'],['\u1C9E','\u10DE'],['\u1C9F','\u10DF'],['\u1CA0','\u10E0'],['\u1CA1','\u10E1'],['\u1CA2','\u10E2'],['\u1CA3','\u10E3'],['\u1CA4','\u10E4'],['\u1CA5','\u10E5'],['\u1CA6','\u10E6'],['\u1CA7','\u10E7'],['\u1CA8','\u10E8'],['\u1CA9','\u10E9'],['\u1CAA','\u10EA'],['\u1CAB','\u10EB'],['\u1CAC','\u10EC'],['\u1CAD','\u10ED'],['\u1CAE','\u10EE'],['\u1CAF','\u10EF'],['\u1CB0','\u10F0'],['\u1CB1','\u10F1'],['\u1CB2','\u10F2'],['\u1CB3','\u10F3'],['\u1CB4','\u10F4'],['\u1CB5','\u10F5'],['\u1CB6','\u10F6'],['\u1CB7','\u10F7'],['\u1CB8','\u10F8'],['\u1CB9','\u10F9'],['\u1CBA','\u10FA'],['\u1CBD','\u10FD'],['\u1CBE','\u10FE'],['\u1CBF','\u10FF'],['\u1E00','\u1E01'],['\u1E02','\u1E03'],['\u1E04','\u1E05'],['\u1E06','\u1E07'],['\u1E08','\u1E09'],['\u1E0A','\u1E0B'],['\u1E0C','\u1E0D'],['\u1E0E','\u1E0F'],['\u1E10','\u1E11'],['\u1E12','\u1E13'],['\u1E14','\u1E15'],['\u1E16','\u1E17'],['\u1E18','\u1E19'],['\u1E1A','\u1E1B'],['\u1E1C','\u1E1D'],['\u1E1E','\u1E1F'],['\u1E20','\u1E21'],['\u1E22','\u1E23'],['\u1E24','\u1E25'],['\u1E26','\u1E27'],['\u1E28','\u1E29'],['\u1E2A','\u1E2B'],['\u1E2C','\u1E2D'],['\u1E2E','\u1E2F'],['\u1E30','\u1E31'],['\u1E32','\u1E33'],['\u1E34','\u1E35'],['\u1E36','\u1E37'],['\u1E38','\u1E39'],['\u1E3A','\u1E3B'],['\u1E3C','\u1E3D'],['\u1E3E','\u1E3F'],['\u1E40','\u1E41'],['\u1E42','\u1E43'],['\u1E44','\u1E45'],['\u1E46','\u1E47'],['\u1E48','\u1E49'],['\u1E4A','\u1E4B'],['\u1E4C','\u1E4D'],['\u1E4E','\u1E4F'],['\u1E50','\u1E51'],['\u1E52','\u1E53'],['\u1E54','\u1E55'],['\u1E56','\u1E57'],['\u1E58','\u1E59'],['\u1E5A','\u1E5B'],['\u1E5C','\u1E5D'],['\u1E5E','\u1E5F'],['\u1E60','\u1E61'],['\u1E62','\u1E63'],['\u1E64','\u1E65'],['\u1E66','\u1E67'],['\u1E68','\u1E69'],['\u1E6A','\u1E6B'],['\u1E6C','\u1E6D'],['\u1E6E','\u1E6F'],['\u1E70','\u1E71'],['\u1E72','\u1E73'],['\u1E74','\u1E75'],['\u1E76','\u1E77'],['\u1E78','\u1E79'],['\u1E7A','\u1E7B'],['\u1E7C','\u1E7D'],['\u1E7E','\u1E7F'],['\u1E80','\u1E81'],['\u1E82','\u1E83'],['\u1E84','\u1E85'],['\u1E86','\u1E87'],['\u1E88','\u1E89'],['\u1E8A','\u1E8B'],['\u1E8C','\u1E8D'],['\u1E8E','\u1E8F'],['\u1E90','\u1E91'],['\u1E92','\u1E93'],['\u1E94','\u1E95'],['\u1E9B','\u1E61'],['\u1EA0','\u1EA1'],['\u1EA2','\u1EA3'],['\u1EA4','\u1EA5'],['\u1EA6','\u1EA7'],['\u1EA8','\u1EA9'],['\u1EAA','\u1EAB'],['\u1EAC','\u1EAD'],['\u1EAE','\u1EAF'],['\u1EB0','\u1EB1'],['\u1EB2','\u1EB3'],['\u1EB4','\u1EB5'],['\u1EB6','\u1EB7'],['\u1EB8','\u1EB9'],['\u1EBA','\u1EBB'],['\u1EBC','\u1EBD'],['\u1EBE','\u1EBF'],['\u1EC0','\u1EC1'],['\u1EC2','\u1EC3'],['\u1EC4','\u1EC5'],['\u1EC6','\u1EC7'],['\u1EC8','\u1EC9'],['\u1ECA','\u1ECB'],['\u1ECC','\u1ECD'],['\u1ECE','\u1ECF'],['\u1ED0','\u1ED1'],['\u1ED2','\u1ED3'],['\u1ED4','\u1ED5'],['\u1ED6','\u1ED7'],['\u1ED8','\u1ED9'],['\u1EDA','\u1EDB'],['\u1EDC','\u1EDD'],['\u1EDE','\u1EDF'],['\u1EE0','\u1EE1'],['\u1EE2','\u1EE3'],['\u1EE4','\u1EE5'],['\u1EE6','\u1EE7'],['\u1EE8','\u1EE9'],['\u1EEA','\u1EEB'],['\u1EEC','\u1EED'],['\u1EEE','\u1EEF'],['\u1EF0','\u1EF1'],['\u1EF2','\u1EF3'],['\u1EF4','\u1EF5'],['\u1EF6','\u1EF7'],['\u1EF8','\u1EF9'],['\u1EFA','\u1EFB'],['\u1EFC','\u1EFD'],['\u1EFE','\u1EFF'],['\u1F08','\u1F00'],['\u1F09','\u1F01'],['\u1F0A','\u1F02'],['\u1F0B','\u1F03'],['\u1F0C','\u1F04'],['\u1F0D','\u1F05'],['\u1F0E','\u1F06'],['\u1F0F','\u1F07'],['\u1F18','\u1F10'],['\u1F19','\u1F11'],['\u1F1A','\u1F12'],['\u1F1B','\u1F13'],['\u1F1C','\u1F14'],['\u1F1D','\u1F15'],['\u1F28','\u1F20'],['\u1F29','\u1F21'],['\u1F2A','\u1F22'],['\u1F2B','\u1F23'],['\u1F2C','\u1F24'],['\u1F2D','\u1F25'],['\u1F2E','\u1F26'],['\u1F2F','\u1F27'],['\u1F38','\u1F30'],['\u1F39','\u1F31'],['\u1F3A','\u1F32'],['\u1F3B','\u1F33'],['\u1F3C','\u1F34'],['\u1F3D','\u1F35'],['\u1F3E','\u1F36'],['\u1F3F','\u1F37'],['\u1F48','\u1F40'],['\u1F49','\u1F41'],['\u1F4A','\u1F42'],['\u1F4B','\u1F43'],['\u1F4C','\u1F44'],['\u1F4D','\u1F45'],['\u1F59','\u1F51'],['\u1F5B','\u1F53'],['\u1F5D','\u1F55'],['\u1F5F','\u1F57'],['\u1F68','\u1F60'],['\u1F69','\u1F61'],['\u1F6A','\u1F62'],['\u1F6B','\u1F63'],['\u1F6C','\u1F64'],['\u1F6D','\u1F65'],['\u1F6E','\u1F66'],['\u1F6F','\u1F67'],['\u1FB8','\u1FB0'],['\u1FB9','\u1FB1'],['\u1FBA','\u1F70'],['\u1FBB','\u1F71'],['\u1FBE','\u03B9'],['\u1FC8','\u1F72'],['\u1FC9','\u1F73'],['\u1FCA','\u1F74'],['\u1FCB','\u1F75'],['\u1FD8','\u1FD0'],['\u1FD9','\u1FD1'],['\u1FDA','\u1F76'],['\u1FDB','\u1F77'],['\u1FE8','\u1FE0'],['\u1FE9','\u1FE1'],['\u1FEA','\u1F7A'],['\u1FEB','\u1F7B'],['\u1FEC','\u1FE5'],['\u1FF8','\u1F78'],['\u1FF9','\u1F79'],['\u1FFA','\u1F7C'],['\u1FFB','\u1F7D'],['\u2126','\u03C9'],['\u212A','k'],['\u212B','\xE5'],['\u2132','\u214E'],['\u2160','\u2170'],['\u2161','\u2171'],['\u2162','\u2172'],['\u2163','\u2173'],['\u2164','\u2174'],['\u2165','\u2175'],['\u2166','\u2176'],['\u2167','\u2177'],['\u2168','\u2178'],['\u2169','\u2179'],['\u216A','\u217A'],['\u216B','\u217B'],['\u216C','\u217C'],['\u216D','\u217D'],['\u216E','\u217E'],['\u216F','\u217F'],['\u2183','\u2184'],['\u24B6','\u24D0'],['\u24B7','\u24D1'],['\u24B8','\u24D2'],['\u24B9','\u24D3'],['\u24BA','\u24D4'],['\u24BB','\u24D5'],['\u24BC','\u24D6'],['\u24BD','\u24D7'],['\u24BE','\u24D8'],['\u24BF','\u24D9'],['\u24C0','\u24DA'],['\u24C1','\u24DB'],['\u24C2','\u24DC'],['\u24C3','\u24DD'],['\u24C4','\u24DE'],['\u24C5','\u24DF'],['\u24C6','\u24E0'],['\u24C7','\u24E1'],['\u24C8','\u24E2'],['\u24C9','\u24E3'],['\u24CA','\u24E4'],['\u24CB','\u24E5'],['\u24CC','\u24E6'],['\u24CD','\u24E7'],['\u24CE','\u24E8'],['\u24CF','\u24E9'],['\u2C00','\u2C30'],['\u2C01','\u2C31'],['\u2C02','\u2C32'],['\u2C03','\u2C33'],['\u2C04','\u2C34'],['\u2C05','\u2C35'],['\u2C06','\u2C36'],['\u2C07','\u2C37'],['\u2C08','\u2C38'],['\u2C09','\u2C39'],['\u2C0A','\u2C3A'],['\u2C0B','\u2C3B'],['\u2C0C','\u2C3C'],['\u2C0D','\u2C3D'],['\u2C0E','\u2C3E'],['\u2C0F','\u2C3F'],['\u2C10','\u2C40'],['\u2C11','\u2C41'],['\u2C12','\u2C42'],['\u2C13','\u2C43'],['\u2C14','\u2C44'],['\u2C15','\u2C45'],['\u2C16','\u2C46'],['\u2C17','\u2C47'],['\u2C18','\u2C48'],['\u2C19','\u2C49'],['\u2C1A','\u2C4A'],['\u2C1B','\u2C4B'],['\u2C1C','\u2C4C'],['\u2C1D','\u2C4D'],['\u2C1E','\u2C4E'],['\u2C1F','\u2C4F'],['\u2C20','\u2C50'],['\u2C21','\u2C51'],['\u2C22','\u2C52'],['\u2C23','\u2C53'],['\u2C24','\u2C54'],['\u2C25','\u2C55'],['\u2C26','\u2C56'],['\u2C27','\u2C57'],['\u2C28','\u2C58'],['\u2C29','\u2C59'],['\u2C2A','\u2C5A'],['\u2C2B','\u2C5B'],['\u2C2C','\u2C5C'],['\u2C2D','\u2C5D'],['\u2C2E','\u2C5E'],['\u2C60','\u2C61'],['\u2C62','\u026B'],['\u2C63','\u1D7D'],['\u2C64','\u027D'],['\u2C67','\u2C68'],['\u2C69','\u2C6A'],['\u2C6B','\u2C6C'],['\u2C6D','\u0251'],['\u2C6E','\u0271'],['\u2C6F','\u0250'],['\u2C70','\u0252'],['\u2C72','\u2C73'],['\u2C75','\u2C76'],['\u2C7E','\u023F'],['\u2C7F','\u0240'],['\u2C80','\u2C81'],['\u2C82','\u2C83'],['\u2C84','\u2C85'],['\u2C86','\u2C87'],['\u2C88','\u2C89'],['\u2C8A','\u2C8B'],['\u2C8C','\u2C8D'],['\u2C8E','\u2C8F'],['\u2C90','\u2C91'],['\u2C92','\u2C93'],['\u2C94','\u2C95'],['\u2C96','\u2C97'],['\u2C98','\u2C99'],['\u2C9A','\u2C9B'],['\u2C9C','\u2C9D'],['\u2C9E','\u2C9F'],['\u2CA0','\u2CA1'],['\u2CA2','\u2CA3'],['\u2CA4','\u2CA5'],['\u2CA6','\u2CA7'],['\u2CA8','\u2CA9'],['\u2CAA','\u2CAB'],['\u2CAC','\u2CAD'],['\u2CAE','\u2CAF'],['\u2CB0','\u2CB1'],['\u2CB2','\u2CB3'],['\u2CB4','\u2CB5'],['\u2CB6','\u2CB7'],['\u2CB8','\u2CB9'],['\u2CBA','\u2CBB'],['\u2CBC','\u2CBD'],['\u2CBE','\u2CBF'],['\u2CC0','\u2CC1'],['\u2CC2','\u2CC3'],['\u2CC4','\u2CC5'],['\u2CC6','\u2CC7'],['\u2CC8','\u2CC9'],['\u2CCA','\u2CCB'],['\u2CCC','\u2CCD'],['\u2CCE','\u2CCF'],['\u2CD0','\u2CD1'],['\u2CD2','\u2CD3'],['\u2CD4','\u2CD5'],['\u2CD6','\u2CD7'],['\u2CD8','\u2CD9'],['\u2CDA','\u2CDB'],['\u2CDC','\u2CDD'],['\u2CDE','\u2CDF'],['\u2CE0','\u2CE1'],['\u2CE2','\u2CE3'],['\u2CEB','\u2CEC'],['\u2CED','\u2CEE'],['\u2CF2','\u2CF3'],['\uA640','\uA641'],['\uA642','\uA643'],['\uA644','\uA645'],['\uA646','\uA647'],['\uA648','\uA649'],['\uA64A','\uA64B'],['\uA64C','\uA64D'],['\uA64E','\uA64F'],['\uA650','\uA651'],['\uA652','\uA653'],['\uA654','\uA655'],['\uA656','\uA657'],['\uA658','\uA659'],['\uA65A','\uA65B'],['\uA65C','\uA65D'],['\uA65E','\uA65F'],['\uA660','\uA661'],['\uA662','\uA663'],['\uA664','\uA665'],['\uA666','\uA667'],['\uA668','\uA669'],['\uA66A','\uA66B'],['\uA66C','\uA66D'],['\uA680','\uA681'],['\uA682','\uA683'],['\uA684','\uA685'],['\uA686','\uA687'],['\uA688','\uA689'],['\uA68A','\uA68B'],['\uA68C','\uA68D'],['\uA68E','\uA68F'],['\uA690','\uA691'],['\uA692','\uA693'],['\uA694','\uA695'],['\uA696','\uA697'],['\uA698','\uA699'],['\uA69A','\uA69B'],['\uA722','\uA723'],['\uA724','\uA725'],['\uA726','\uA727'],['\uA728','\uA729'],['\uA72A','\uA72B'],['\uA72C','\uA72D'],['\uA72E','\uA72F'],['\uA732','\uA733'],['\uA734','\uA735'],['\uA736','\uA737'],['\uA738','\uA739'],['\uA73A','\uA73B'],['\uA73C','\uA73D'],['\uA73E','\uA73F'],['\uA740','\uA741'],['\uA742','\uA743'],['\uA744','\uA745'],['\uA746','\uA747'],['\uA748','\uA749'],['\uA74A','\uA74B'],['\uA74C','\uA74D'],['\uA74E','\uA74F'],['\uA750','\uA751'],['\uA752','\uA753'],['\uA754','\uA755'],['\uA756','\uA757'],['\uA758','\uA759'],['\uA75A','\uA75B'],['\uA75C','\uA75D'],['\uA75E','\uA75F'],['\uA760','\uA761'],['\uA762','\uA763'],['\uA764','\uA765'],['\uA766','\uA767'],['\uA768','\uA769'],['\uA76A','\uA76B'],['\uA76C','\uA76D'],['\uA76E','\uA76F'],['\uA779','\uA77A'],['\uA77B','\uA77C'],['\uA77D','\u1D79'],['\uA77E','\uA77F'],['\uA780','\uA781'],['\uA782','\uA783'],['\uA784','\uA785'],['\uA786','\uA787'],['\uA78B','\uA78C'],['\uA78D','\u0265'],['\uA790','\uA791'],['\uA792','\uA793'],['\uA796','\uA797'],['\uA798','\uA799'],['\uA79A','\uA79B'],['\uA79C','\uA79D'],['\uA79E','\uA79F'],['\uA7A0','\uA7A1'],['\uA7A2','\uA7A3'],['\uA7A4','\uA7A5'],['\uA7A6','\uA7A7'],['\uA7A8','\uA7A9'],['\uA7AA','\u0266'],['\uA7AB','\u025C'],['\uA7AC','\u0261'],['\uA7AD','\u026C'],['\uA7AE','\u026A'],['\uA7B0','\u029E'],['\uA7B1','\u0287'],['\uA7B2','\u029D'],['\uA7B3','\uAB53'],['\uA7B4','\uA7B5'],['\uA7B6','\uA7B7'],['\uA7B8','\uA7B9'],['\uA7BA','\uA7BB'],['\uA7BC','\uA7BD'],['\uA7BE','\uA7BF'],['\uA7C2','\uA7C3'],['\uA7C4','\uA794'],['\uA7C5','\u0282'],['\uA7C6','\u1D8E'],['\uA7C7','\uA7C8'],['\uA7C9','\uA7CA'],['\uA7F5','\uA7F6'],['\uAB70','\u13A0'],['\uAB71','\u13A1'],['\uAB72','\u13A2'],['\uAB73','\u13A3'],['\uAB74','\u13A4'],['\uAB75','\u13A5'],['\uAB76','\u13A6'],['\uAB77','\u13A7'],['\uAB78','\u13A8'],['\uAB79','\u13A9'],['\uAB7A','\u13AA'],['\uAB7B','\u13AB'],['\uAB7C','\u13AC'],['\uAB7D','\u13AD'],['\uAB7E','\u13AE'],['\uAB7F','\u13AF'],['\uAB80','\u13B0'],['\uAB81','\u13B1'],['\uAB82','\u13B2'],['\uAB83','\u13B3'],['\uAB84','\u13B4'],['\uAB85','\u13B5'],['\uAB86','\u13B6'],['\uAB87','\u13B7'],['\uAB88','\u13B8'],['\uAB89','\u13B9'],['\uAB8A','\u13BA'],['\uAB8B','\u13BB'],['\uAB8C','\u13BC'],['\uAB8D','\u13BD'],['\uAB8E','\u13BE'],['\uAB8F','\u13BF'],['\uAB90','\u13C0'],['\uAB91','\u13C1'],['\uAB92','\u13C2'],['\uAB93','\u13C3'],['\uAB94','\u13C4'],['\uAB95','\u13C5'],['\uAB96','\u13C6'],['\uAB97','\u13C7'],['\uAB98','\u13C8'],['\uAB99','\u13C9'],['\uAB9A','\u13CA'],['\uAB9B','\u13CB'],['\uAB9C','\u13CC'],['\uAB9D','\u13CD'],['\uAB9E','\u13CE'],['\uAB9F','\u13CF'],['\uABA0','\u13D0'],['\uABA1','\u13D1'],['\uABA2','\u13D2'],['\uABA3','\u13D3'],['\uABA4','\u13D4'],['\uABA5','\u13D5'],['\uABA6','\u13D6'],['\uABA7','\u13D7'],['\uABA8','\u13D8'],['\uABA9','\u13D9'],['\uABAA','\u13DA'],['\uABAB','\u13DB'],['\uABAC','\u13DC'],['\uABAD','\u13DD'],['\uABAE','\u13DE'],['\uABAF','\u13DF'],['\uABB0','\u13E0'],['\uABB1','\u13E1'],['\uABB2','\u13E2'],['\uABB3','\u13E3'],['\uABB4','\u13E4'],['\uABB5','\u13E5'],['\uABB6','\u13E6'],['\uABB7','\u13E7'],['\uABB8','\u13E8'],['\uABB9','\u13E9'],['\uABBA','\u13EA'],['\uABBB','\u13EB'],['\uABBC','\u13EC'],['\uABBD','\u13ED'],['\uABBE','\u13EE'],['\uABBF','\u13EF'],['\uFF21','\uFF41'],['\uFF22','\uFF42'],['\uFF23','\uFF43'],['\uFF24','\uFF44'],['\uFF25','\uFF45'],['\uFF26','\uFF46'],['\uFF27','\uFF47'],['\uFF28','\uFF48'],['\uFF29','\uFF49'],['\uFF2A','\uFF4A'],['\uFF2B','\uFF4B'],['\uFF2C','\uFF4C'],['\uFF2D','\uFF4D'],['\uFF2E','\uFF4E'],['\uFF2F','\uFF4F'],['\uFF30','\uFF50'],['\uFF31','\uFF51'],['\uFF32','\uFF52'],['\uFF33','\uFF53'],['\uFF34','\uFF54'],['\uFF35','\uFF55'],['\uFF36','\uFF56'],['\uFF37','\uFF57'],['\uFF38','\uFF58'],['\uFF39','\uFF59'],['\uFF3A','\uFF5A'],['\uD801\uDC00','\uD801\uDC28'],['\uD801\uDC01','\uD801\uDC29'],['\uD801\uDC02','\uD801\uDC2A'],['\uD801\uDC03','\uD801\uDC2B'],['\uD801\uDC04','\uD801\uDC2C'],['\uD801\uDC05','\uD801\uDC2D'],['\uD801\uDC06','\uD801\uDC2E'],['\uD801\uDC07','\uD801\uDC2F'],['\uD801\uDC08','\uD801\uDC30'],['\uD801\uDC09','\uD801\uDC31'],['\uD801\uDC0A','\uD801\uDC32'],['\uD801\uDC0B','\uD801\uDC33'],['\uD801\uDC0C','\uD801\uDC34'],['\uD801\uDC0D','\uD801\uDC35'],['\uD801\uDC0E','\uD801\uDC36'],['\uD801\uDC0F','\uD801\uDC37'],['\uD801\uDC10','\uD801\uDC38'],['\uD801\uDC11','\uD801\uDC39'],['\uD801\uDC12','\uD801\uDC3A'],['\uD801\uDC13','\uD801\uDC3B'],['\uD801\uDC14','\uD801\uDC3C'],['\uD801\uDC15','\uD801\uDC3D'],['\uD801\uDC16','\uD801\uDC3E'],['\uD801\uDC17','\uD801\uDC3F'],['\uD801\uDC18','\uD801\uDC40'],['\uD801\uDC19','\uD801\uDC41'],['\uD801\uDC1A','\uD801\uDC42'],['\uD801\uDC1B','\uD801\uDC43'],['\uD801\uDC1C','\uD801\uDC44'],['\uD801\uDC1D','\uD801\uDC45'],['\uD801\uDC1E','\uD801\uDC46'],['\uD801\uDC1F','\uD801\uDC47'],['\uD801\uDC20','\uD801\uDC48'],['\uD801\uDC21','\uD801\uDC49'],['\uD801\uDC22','\uD801\uDC4A'],['\uD801\uDC23','\uD801\uDC4B'],['\uD801\uDC24','\uD801\uDC4C'],['\uD801\uDC25','\uD801\uDC4D'],['\uD801\uDC26','\uD801\uDC4E'],['\uD801\uDC27','\uD801\uDC4F'],['\uD801\uDCB0','\uD801\uDCD8'],['\uD801\uDCB1','\uD801\uDCD9'],['\uD801\uDCB2','\uD801\uDCDA'],['\uD801\uDCB3','\uD801\uDCDB'],['\uD801\uDCB4','\uD801\uDCDC'],['\uD801\uDCB5','\uD801\uDCDD'],['\uD801\uDCB6','\uD801\uDCDE'],['\uD801\uDCB7','\uD801\uDCDF'],['\uD801\uDCB8','\uD801\uDCE0'],['\uD801\uDCB9','\uD801\uDCE1'],['\uD801\uDCBA','\uD801\uDCE2'],['\uD801\uDCBB','\uD801\uDCE3'],['\uD801\uDCBC','\uD801\uDCE4'],['\uD801\uDCBD','\uD801\uDCE5'],['\uD801\uDCBE','\uD801\uDCE6'],['\uD801\uDCBF','\uD801\uDCE7'],['\uD801\uDCC0','\uD801\uDCE8'],['\uD801\uDCC1','\uD801\uDCE9'],['\uD801\uDCC2','\uD801\uDCEA'],['\uD801\uDCC3','\uD801\uDCEB'],['\uD801\uDCC4','\uD801\uDCEC'],['\uD801\uDCC5','\uD801\uDCED'],['\uD801\uDCC6','\uD801\uDCEE'],['\uD801\uDCC7','\uD801\uDCEF'],['\uD801\uDCC8','\uD801\uDCF0'],['\uD801\uDCC9','\uD801\uDCF1'],['\uD801\uDCCA','\uD801\uDCF2'],['\uD801\uDCCB','\uD801\uDCF3'],['\uD801\uDCCC','\uD801\uDCF4'],['\uD801\uDCCD','\uD801\uDCF5'],['\uD801\uDCCE','\uD801\uDCF6'],['\uD801\uDCCF','\uD801\uDCF7'],['\uD801\uDCD0','\uD801\uDCF8'],['\uD801\uDCD1','\uD801\uDCF9'],['\uD801\uDCD2','\uD801\uDCFA'],['\uD801\uDCD3','\uD801\uDCFB'],['\uD803\uDC80','\uD803\uDCC0'],['\uD803\uDC81','\uD803\uDCC1'],['\uD803\uDC82','\uD803\uDCC2'],['\uD803\uDC83','\uD803\uDCC3'],['\uD803\uDC84','\uD803\uDCC4'],['\uD803\uDC85','\uD803\uDCC5'],['\uD803\uDC86','\uD803\uDCC6'],['\uD803\uDC87','\uD803\uDCC7'],['\uD803\uDC88','\uD803\uDCC8'],['\uD803\uDC89','\uD803\uDCC9'],['\uD803\uDC8A','\uD803\uDCCA'],['\uD803\uDC8B','\uD803\uDCCB'],['\uD803\uDC8C','\uD803\uDCCC'],['\uD803\uDC8D','\uD803\uDCCD'],['\uD803\uDC8E','\uD803\uDCCE'],['\uD803\uDC8F','\uD803\uDCCF'],['\uD803\uDC90','\uD803\uDCD0'],['\uD803\uDC91','\uD803\uDCD1'],['\uD803\uDC92','\uD803\uDCD2'],['\uD803\uDC93','\uD803\uDCD3'],['\uD803\uDC94','\uD803\uDCD4'],['\uD803\uDC95','\uD803\uDCD5'],['\uD803\uDC96','\uD803\uDCD6'],['\uD803\uDC97','\uD803\uDCD7'],['\uD803\uDC98','\uD803\uDCD8'],['\uD803\uDC99','\uD803\uDCD9'],['\uD803\uDC9A','\uD803\uDCDA'],['\uD803\uDC9B','\uD803\uDCDB'],['\uD803\uDC9C','\uD803\uDCDC'],['\uD803\uDC9D','\uD803\uDCDD'],['\uD803\uDC9E','\uD803\uDCDE'],['\uD803\uDC9F','\uD803\uDCDF'],['\uD803\uDCA0','\uD803\uDCE0'],['\uD803\uDCA1','\uD803\uDCE1'],['\uD803\uDCA2','\uD803\uDCE2'],['\uD803\uDCA3','\uD803\uDCE3'],['\uD803\uDCA4','\uD803\uDCE4'],['\uD803\uDCA5','\uD803\uDCE5'],['\uD803\uDCA6','\uD803\uDCE6'],['\uD803\uDCA7','\uD803\uDCE7'],['\uD803\uDCA8','\uD803\uDCE8'],['\uD803\uDCA9','\uD803\uDCE9'],['\uD803\uDCAA','\uD803\uDCEA'],['\uD803\uDCAB','\uD803\uDCEB'],['\uD803\uDCAC','\uD803\uDCEC'],['\uD803\uDCAD','\uD803\uDCED'],['\uD803\uDCAE','\uD803\uDCEE'],['\uD803\uDCAF','\uD803\uDCEF'],['\uD803\uDCB0','\uD803\uDCF0'],['\uD803\uDCB1','\uD803\uDCF1'],['\uD803\uDCB2','\uD803\uDCF2'],['\uD806\uDCA0','\uD806\uDCC0'],['\uD806\uDCA1','\uD806\uDCC1'],['\uD806\uDCA2','\uD806\uDCC2'],['\uD806\uDCA3','\uD806\uDCC3'],['\uD806\uDCA4','\uD806\uDCC4'],['\uD806\uDCA5','\uD806\uDCC5'],['\uD806\uDCA6','\uD806\uDCC6'],['\uD806\uDCA7','\uD806\uDCC7'],['\uD806\uDCA8','\uD806\uDCC8'],['\uD806\uDCA9','\uD806\uDCC9'],['\uD806\uDCAA','\uD806\uDCCA'],['\uD806\uDCAB','\uD806\uDCCB'],['\uD806\uDCAC','\uD806\uDCCC'],['\uD806\uDCAD','\uD806\uDCCD'],['\uD806\uDCAE','\uD806\uDCCE'],['\uD806\uDCAF','\uD806\uDCCF'],['\uD806\uDCB0','\uD806\uDCD0'],['\uD806\uDCB1','\uD806\uDCD1'],['\uD806\uDCB2','\uD806\uDCD2'],['\uD806\uDCB3','\uD806\uDCD3'],['\uD806\uDCB4','\uD806\uDCD4'],['\uD806\uDCB5','\uD806\uDCD5'],['\uD806\uDCB6','\uD806\uDCD6'],['\uD806\uDCB7','\uD806\uDCD7'],['\uD806\uDCB8','\uD806\uDCD8'],['\uD806\uDCB9','\uD806\uDCD9'],['\uD806\uDCBA','\uD806\uDCDA'],['\uD806\uDCBB','\uD806\uDCDB'],['\uD806\uDCBC','\uD806\uDCDC'],['\uD806\uDCBD','\uD806\uDCDD'],['\uD806\uDCBE','\uD806\uDCDE'],['\uD806\uDCBF','\uD806\uDCDF'],['\uD81B\uDE40','\uD81B\uDE60'],['\uD81B\uDE41','\uD81B\uDE61'],['\uD81B\uDE42','\uD81B\uDE62'],['\uD81B\uDE43','\uD81B\uDE63'],['\uD81B\uDE44','\uD81B\uDE64'],['\uD81B\uDE45','\uD81B\uDE65'],['\uD81B\uDE46','\uD81B\uDE66'],['\uD81B\uDE47','\uD81B\uDE67'],['\uD81B\uDE48','\uD81B\uDE68'],['\uD81B\uDE49','\uD81B\uDE69'],['\uD81B\uDE4A','\uD81B\uDE6A'],['\uD81B\uDE4B','\uD81B\uDE6B'],['\uD81B\uDE4C','\uD81B\uDE6C'],['\uD81B\uDE4D','\uD81B\uDE6D'],['\uD81B\uDE4E','\uD81B\uDE6E'],['\uD81B\uDE4F','\uD81B\uDE6F'],['\uD81B\uDE50','\uD81B\uDE70'],['\uD81B\uDE51','\uD81B\uDE71'],['\uD81B\uDE52','\uD81B\uDE72'],['\uD81B\uDE53','\uD81B\uDE73'],['\uD81B\uDE54','\uD81B\uDE74'],['\uD81B\uDE55','\uD81B\uDE75'],['\uD81B\uDE56','\uD81B\uDE76'],['\uD81B\uDE57','\uD81B\uDE77'],['\uD81B\uDE58','\uD81B\uDE78'],['\uD81B\uDE59','\uD81B\uDE79'],['\uD81B\uDE5A','\uD81B\uDE7A'],['\uD81B\uDE5B','\uD81B\uDE7B'],['\uD81B\uDE5C','\uD81B\uDE7C'],['\uD81B\uDE5D','\uD81B\uDE7D'],['\uD81B\uDE5E','\uD81B\uDE7E'],['\uD81B\uDE5F','\uD81B\uDE7F'],['\uD83A\uDD00','\uD83A\uDD22'],['\uD83A\uDD01','\uD83A\uDD23'],['\uD83A\uDD02','\uD83A\uDD24'],['\uD83A\uDD03','\uD83A\uDD25'],['\uD83A\uDD04','\uD83A\uDD26'],['\uD83A\uDD05','\uD83A\uDD27'],['\uD83A\uDD06','\uD83A\uDD28'],['\uD83A\uDD07','\uD83A\uDD29'],['\uD83A\uDD08','\uD83A\uDD2A'],['\uD83A\uDD09','\uD83A\uDD2B'],['\uD83A\uDD0A','\uD83A\uDD2C'],['\uD83A\uDD0B','\uD83A\uDD2D'],['\uD83A\uDD0C','\uD83A\uDD2E'],['\uD83A\uDD0D','\uD83A\uDD2F'],['\uD83A\uDD0E','\uD83A\uDD30'],['\uD83A\uDD0F','\uD83A\uDD31'],['\uD83A\uDD10','\uD83A\uDD32'],['\uD83A\uDD11','\uD83A\uDD33'],['\uD83A\uDD12','\uD83A\uDD34'],['\uD83A\uDD13','\uD83A\uDD35'],['\uD83A\uDD14','\uD83A\uDD36'],['\uD83A\uDD15','\uD83A\uDD37'],['\uD83A\uDD16','\uD83A\uDD38'],['\uD83A\uDD17','\uD83A\uDD39'],['\uD83A\uDD18','\uD83A\uDD3A'],['\uD83A\uDD19','\uD83A\uDD3B'],['\uD83A\uDD1A','\uD83A\uDD3C'],['\uD83A\uDD1B','\uD83A\uDD3D'],['\uD83A\uDD1C','\uD83A\uDD3E'],['\uD83A\uDD1D','\uD83A\uDD3F'],['\uD83A\uDD1E','\uD83A\uDD40'],['\uD83A\uDD1F','\uD83A\uDD41'],['\uD83A\uDD20','\uD83A\uDD42'],['\uD83A\uDD21','\uD83A\uDD43']]);

  var symbols$1=new Map([['\u1E9E','\xDF'],['\u1F88','\u1F80'],['\u1F89','\u1F81'],['\u1F8A','\u1F82'],['\u1F8B','\u1F83'],['\u1F8C','\u1F84'],['\u1F8D','\u1F85'],['\u1F8E','\u1F86'],['\u1F8F','\u1F87'],['\u1F98','\u1F90'],['\u1F99','\u1F91'],['\u1F9A','\u1F92'],['\u1F9B','\u1F93'],['\u1F9C','\u1F94'],['\u1F9D','\u1F95'],['\u1F9E','\u1F96'],['\u1F9F','\u1F97'],['\u1FA8','\u1FA0'],['\u1FA9','\u1FA1'],['\u1FAA','\u1FA2'],['\u1FAB','\u1FA3'],['\u1FAC','\u1FA4'],['\u1FAD','\u1FA5'],['\u1FAE','\u1FA6'],['\u1FAF','\u1FA7'],['\u1FBC','\u1FB3'],['\u1FCC','\u1FC3'],['\u1FFC','\u1FF3']]);

  class State {
    constructor(endIndex, captures) {
      this.endIndex = endIndex;
      this.captures = captures;
    }

  }

  function isContinuation(v) {
    return typeof v === 'function' && v.length === 1;
  }

  class CharSet {
    union(other) {
      const concrete = new Set();
      const fns = new Set();

      const add = cs => {
        if (cs.fns) {
          cs.fns.forEach(fn => {
            fns.add(fn);
          });
          cs.concrete.forEach(c => {
            concrete.add(c);
          });
        } else if (cs.fn) {
          fns.add(cs.fn);
        } else {
          cs.concrete.forEach(c => {
            concrete.add(c);
          });
        }
      };

      add(this);
      add(other);
      return new UnionCharSet(concrete, fns);
    }

  }

  class UnionCharSet extends CharSet {
    constructor(concrete, fns) {
      super();
      this.concrete = concrete;
      this.fns = fns;
    }

    has(c) {
      if (this.concrete.has(c)) {
        return true;
      }

      for (const fn of this.fns) {
        if (fn(c)) {
          return true;
        }
      }

      return false;
    }

  }

  class ConcreteCharSet extends CharSet {
    constructor(items) {
      super();
      this.concrete = items instanceof Set ? items : new Set(items);
    }

    has(c) {
      return this.concrete.has(c);
    }

    get size() {
      return this.concrete.size;
    }

    first() {
      Assert(this.concrete.size >= 1, "this.concrete.size >= 1");
      return this.concrete.values().next().value;
    }

  }

  class VirtualCharSet extends CharSet {
    constructor(fn) {
      super();
      this.fn = fn;
    }

    has(c) {
      return this.fn(c);
    }

  }

  class Range {
    constructor(startIndex, endIndex) {
      Assert(startIndex <= endIndex, "startIndex <= endIndex");
      this.startIndex = startIndex;
      this.endIndex = endIndex;
    }

  } // #sec-pattern
  //   Pattern :: Disjunction


  function Evaluate_Pattern(Pattern, flags) {
    // The descriptions below use the following variables:
    //   * Input is a List consisting of all of the characters, in order, of the String being matched
    //     by the regular expression pattern. Each character is either a code unit or a code point,
    //     depending upon the kind of pattern involved. The notation Input[n] means the nth character
    //     of Input, where n can range between 0 (inclusive) and InputLength (exclusive).
    //   * InputLength is the number of characters in Input.
    //   * NcapturingParens is the total number of left-capturing parentheses (i.e. the total number of
    //     Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes) in the pattern. A left-capturing parenthesis
    //     is any `(` pattern character that is matched by the `(` terminal of the Atom :: `(` GroupSpecifier Disjunction `)`
    //     production.
    //   * DotAll is true if the RegExp object's [[OriginalFlags]] internal slot contains "s" and otherwise is false.
    //   * IgnoreCase is true if the RegExp object's [[OriginalFlags]] internal slot contains "i" and otherwise is false.
    //   * Multiline is true if the RegExp object's [[OriginalFlags]] internal slot contains "m" and otherwise is false.
    //   * Unicode is true if the RegExp object's [[OriginalFlags]] internal slot contains "u" and otherwise is false.
    let Input;
    let InputLength;
    const NcapturingParens = Pattern.capturingGroups.length;
    const DotAll = flags.includes('s');
    const IgnoreCase = flags.includes('i');
    const Multiline = flags.includes('m');
    const Unicode = flags.includes('u');
    {
      // 1. Evaluate Disjunction with +1 as its direction argument to obtain a Matcher m.
      const m = Evaluate(Pattern.Disjunction, +1); // 2. Return a new abstract closure with parameters (str, index) that captures m and performs the following steps when called:

      return (str, index) => {
        // a. Assert: Type(str) is String.
        Assert(Type(str) === 'String', "Type(str) === 'String'"); // b. Assert: ! IsNonNegativeInteger(index) is true and index ≤ the length of str.

        let _temp = IsNonNegativeInteger(index);

        Assert(!(_temp instanceof AbruptCompletion), "IsNonNegativeInteger(index)" + ' returned an abrupt completion');
        /* istanbul ignore if */

        if (_temp instanceof Completion) {
          _temp = _temp.Value;
        }

        Assert(_temp === Value.true && index.numberValue() <= str.stringValue().length, "X(IsNonNegativeInteger(index)) === Value.true\n             && index.numberValue() <= str.stringValue().length"); // c. If Unicode is true, let Input be a List consisting of the sequence of code points of ! StringToCodePoints(str).
        //    Otherwise, let Input be a List consisting of the sequence of code units that are the elements of str.
        //    Input will be used throughout the algorithms in 21.2.2. Each element of Input is considered to be a character.

        if (Unicode) {
          let _temp2 = StringToCodePoints(str.stringValue());

          Assert(!(_temp2 instanceof AbruptCompletion), "StringToCodePoints(str.stringValue())" + ' returned an abrupt completion');

          if (_temp2 instanceof Completion) {
            _temp2 = _temp2.Value;
          }

          Input = _temp2;
        } else {
          Input = str.stringValue().split('').map(c => c.charCodeAt(0));
        } // d. Let InputLength be the number of characters contained in Input. This variable will be used throughout the algorithms in 21.2.2.


        InputLength = Input.length; // e. Let listIndex be the index into Input of the character that was obtained from element index of str.

        const listIndex = index.numberValue(); // f. Let c be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:

        const c = y => {
          // i. Assert: y is a State.
          Assert(y instanceof State, "y instanceof State"); // ii. Return y.

          return y;
        }; // g. Let cap be a List of NcapturingParens undefined values, indexed 1 through NcapturingParens.


        const cap = Array.from({
          length: NcapturingParens + 1
        }, () => Value.undefined); // h. Let x be the State (listIndex, cap).

        const x = new State(listIndex, cap); // i. Call m(x, c) and return its result.

        return m(x, c);
      };
    }

    function Evaluate(node, ...args) {
      switch (node.type) {
        case 'Disjunction':
          return Evaluate_Disjunction(node, ...args);

        case 'Alternative':
          return Evaluate_Alternative(node, ...args);

        case 'Term':
          return Evaluate_Term(node, ...args);

        case 'Assertion':
          return Evaluate_Assertion(node, ...args);

        case 'Quantifier':
          return Evaluate_Quantifier(node, ...args);

        case 'Atom':
          return Evaluate_Atom(node, ...args);

        case 'AtomEscape':
          return Evaluate_AtomEscape(node, ...args);

        case 'CharacterEscape':
          return Evaluate_CharacterEscape(node, ...args);

        case 'DecimalEscape':
          return Evaluate_DecimalEscape(node, ...args);

        case 'CharacterClassEscape':
          return Evaluate_CharacterClassEscape(node, ...args);

        case 'UnicodePropertyValueExpression':
          return Evaluate_UnicodePropertyValueExpression(node, ...args);

        case 'CharacterClass':
          return Evaluate_CharacterClass(node, ...args);

        case 'ClassAtom':
          return Evaluate_ClassAtom(node, ...args);

        case 'ClassEscape':
          return Evaluate_ClassEscape(node, ...args);

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('Evaluate', node);
      }
    } // #sec-disjunction
    //   Disjunction ::
    //     Alternative
    //     Alternative `|` Disjunction


    function Evaluate_Disjunction({
      Alternative,
      Disjunction
    }, direction) {
      if (!Disjunction) {
        // 1. Evaluate Alternative with argument direction to obtain a Matcher m.
        const m = Evaluate(Alternative, direction); // 2. Return m.

        return m;
      } // 1. Evaluate Alternative with argument direction to obtain a Matcher m1.


      const m1 = Evaluate(Alternative, direction); // 2. Evaluate Disjunction with argument direction to obtain a Matcher m2.

      const m2 = Evaluate(Disjunction, direction); // 3. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:

      return (x, c) => {
        // a. Assert: x is a State.
        Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

        Assert(isContinuation(c), "isContinuation(c)"); // c. Call m1(x, c) and let r be its result.

        const r = m1(x, c); // d. If r is not failure, return r.

        if (r !== 'failure') {
          return r;
        } // e. Call m2(x, c) and return its result.


        return m2(x, c);
      };
    } // #sec-alternative

    function Evaluate_Alternative({
      Alternative,
      Term
    }, direction) {
      if (!Alternative && !Term) {
        // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
        return (x, c) => {
          // 1. Assert: x is a State.
          Assert(x instanceof State, "x instanceof State"); // 2. Assert: c is a Continuation.

          Assert(isContinuation(c), "isContinuation(c)"); // 3. Call c(x) and return its result.

          return c(x);
        };
      } // 1. Evaluate Alternative with argument direction to obtain a Matcher m1.


      const m1 = Evaluate(Alternative, direction); // 2. Evaluate Term with argument direction to obtain a Matcher m2.

      const m2 = Evaluate(Term, direction); // 3. If direction is equal to +1, then

      if (direction === +1) {
        // a. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:
        return (x, c) => {
          // i. Assert: x is a State.
          Assert(x instanceof State, "x instanceof State"); // ii. Assert: c is a Continuation.

          Assert(isContinuation(c), "isContinuation(c)"); // iii. Let d be a new Continuation with parameters (y) that captures c and m2 and performs the following steps when called:

          const d = y => {
            // 1. Assert: y is a State.
            Assert(y instanceof State, "y instanceof State"); // 2. Call m2(y, c) and return its result.

            return m2(y, c);
          }; // iv. Call m1(x, d) and return its result.


          return m1(x, d);
        };
      } else {
        // 4. Else,
        // a. Assert: direction is equal to -1.
        Assert(direction === -1, "direction === -1"); // b. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:

        return (x, c) => {
          // i. Assert: x is a State.
          Assert(x instanceof State, "x instanceof State"); // ii. Assert: c is a Continuation.

          Assert(isContinuation(c), "isContinuation(c)"); // iii. Let d be a new Continuation with parameters (y) that captures c and m1 and performs the following steps when called:

          const d = y => {
            // 1. Assert: y is a State.
            Assert(y instanceof State, "y instanceof State"); // 2. Call m1(y, c) and return its result.

            return m1(y, c);
          }; // iv. Call m2(x, d) and return its result.


          return m2(x, d);
        };
      }
    } // #sec-term

    function Evaluate_Term(Term, direction) {
      const {
        Atom,
        Quantifier
      } = Term;

      if (!Quantifier) {
        // 1. Return the Matcher that is the result of evaluating Atom with argument direction.
        return Evaluate(Atom, direction);
      } // 1. Evaluate Atom with argument direction to obtain a Matcher m.


      const m = Evaluate(Atom, direction); // 2. Evaluate Quantifier to obtain the three results: an integer min, an integer (or ∞) max, and Boolean greedy.

      const [min, max, greedy] = Evaluate(Quantifier); // 3. Assert: If max is finite, then max is not less than min.

      Assert(!Number.isFinite(max) || max >= min, "!Number.isFinite(max) || (max >= min)"); // 4. Let parenIndex be the number of left-capturing parentheses in the entire regular expression that occur to the
      //    left of this Term. This is the total number of Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes prior to
      //    or enclosing this Term.

      const parenIndex = Term.capturingParenthesesBefore; // 5. Let parenCount be the number of left-capturing parentheses in Atom. This is the total number of
      //    Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes enclosed by Atom.

      const parenCount = Atom.enclosedCapturingParentheses; // 6. Return a new Matcher with parameters (x, c) that captures m, min, max, greedy, parenIndex, and parenCount and performs the following steps when called:

      return (x, c) => {
        // a. Assert: x is a State.
        Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

        Assert(isContinuation(c), "isContinuation(c)"); // c. Call RepeatMatcher(m, min, max, greedy, x, c, parenIndex, parenCount) and return its result.

        return RepeatMatcher(m, min, max, greedy, x, c, parenIndex, parenCount);
      };
    } // #sec-runtime-semantics-repeatmatcher-abstract-operation

    function RepeatMatcher(m, min, max, greedy, x, c, parenIndex, parenCount) {
      // 1. If max is zero, return c(x).
      if (max === 0) {
        return c(x);
      } // 2. Let d be a new Continuation with parameters (y) that captures m, min, max, greedy, x, c, parenIndex, and parenCount and performs the following steps when called:


      const d = y => {
        // a. Assert: y is a State.
        Assert(y instanceof State, "y instanceof State"); // b. If min is zero and y's endIndex is equal to x's endIndex, return failure.

        if (min === 0 && y.endIndex === x.endIndex) {
          return 'failure';
        } // c. If min is zero, let min2 be zero; otherwise let min2 be min - 1.


        let min2;

        if (min === 0) {
          min2 = 0;
        } else {
          min2 = min - 1;
        } // d. If max is ∞, let max2 be ∞; otherwise let max2 be max - 1.


        let max2;

        if (max === Infinity) {
          max2 = Infinity;
        } else {
          max2 = max - 1;
        } // e. Call RepeatMatcher(m, min2, max2, greedy, y, c, parenIndex, parenCount) and return its result.


        return RepeatMatcher(m, min2, max2, greedy, y, c, parenIndex, parenCount);
      }; // 3. Let cap be a copy of x's captures List.


      const cap = [...x.captures]; // 4. For each integer k that satisfies parenIndex < k and k ≤ parenIndex + parenCount, set cap[k] to undefined.

      for (let k = parenIndex + 1; k <= parenIndex + parenCount; k += 1) {
        cap[k] = Value.undefined;
      } // 5. Let e be x's endIndex.


      const e = x.endIndex; // 6. Let xr be the State (e, cap).

      const xr = new State(e, cap); // 7. If min is not zero, return m(xr, d).

      if (min !== 0) {
        return m(xr, d);
      } // 8. If greedy is false, then


      if (greedy === false) {
        // a. Call c(x) and let z be its result.
        const z = c(x); // b. If z is not failure, return z.

        if (z !== 'failure') {
          return z;
        } // c. Call m(xr, d) and return its result.


        return m(xr, d);
      } // 9. Call m(xr, d) and let z be its result.


      const z = m(xr, d); // 10. If z is not failure, return z.

      if (z !== 'failure') {
        return z;
      } // 11. Call c(x) and return its result.


      return c(x);
    } // #sec-assertion

    function Evaluate_Assertion({
      subtype,
      Disjunction
    }) {
      switch (subtype) {
        case '^':
          // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
          return (x, c) => {
            // a. Assert: x is a State.
            Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

            Assert(isContinuation(c), "isContinuation(c)"); // c. Let e be x's endIndex.

            const e = x.endIndex; // d. If e is zero, or if Multiline is true and the character Input[e - 1] is one of LineTerminator, then

            if (e === 0 || Multiline && isLineTerminator(String.fromCodePoint(Input[e - 1]))) {
              // i. Call c(x) and return its result.
              return c(x);
            } // e. Return failure.


            return 'failure';
          };

        case '$':
          // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
          return (x, c) => {
            // a. Assert: x is a State.
            Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

            Assert(isContinuation(c), "isContinuation(c)"); // c. Let e be x's endIndex.

            const e = x.endIndex; // d. If e is equal to InputLength, or if Multiline is true and the character Input[e] is one of LineTerminator, then

            if (e === InputLength || Multiline && isLineTerminator(String.fromCodePoint(Input[e]))) {
              // i. Call c(x) and return its result.
              return c(x);
            } // e. Return failure.


            return 'failure';
          };

        case 'b':
          // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
          return (x, c) => {
            // a. Assert: x is a State.
            Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

            Assert(isContinuation(c), "isContinuation(c)"); // c. Let e be x's endIndex.

            const e = x.endIndex; // d. Call IsWordChar(e - 1) and let a be the Boolean result.

            const a = IsWordChar(e - 1); // e. Call IsWordChar(e) and let b be the Boolean result.

            const b = IsWordChar(e); // f. If a is true and b is false, or if a is false and b is true, then

            if (a && !b || !a && b) {
              // i. Call c(x) and return its result.
              return c(x);
            } // g. Return failure.


            return 'failure';
          };

        case 'B':
          // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
          return (x, c) => {
            // a. Assert: x is a State.
            Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

            Assert(isContinuation(c), "isContinuation(c)"); // c. Let e be x's endIndex.

            const e = x.endIndex; // d. Call IsWordChar(e - 1) and let a be the Boolean result.

            const a = IsWordChar(e - 1); // e. Call IsWordChar(e) and let b be the Boolean result.

            const b = IsWordChar(e); // f. If a is true and b is true, or if a is false and b is false, then

            if (a && b || !a && !b) {
              // i. Call c(x) and return its result.
              return c(x);
            } // g. Return failure.


            return 'failure';
          };

        case '?=':
          {
            // 1. Evaluate Disjunction with +1 as its direction argument to obtain a Matcher m.
            const m = Evaluate(Disjunction, +1); // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:

            return (x, c) => {
              // a. Assert: x is a State.
              Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

              Assert(isContinuation(c), "isContinuation(c)"); // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:

              const d = y => {
                // i. Assert: y is a State.
                Assert(y instanceof State, "y instanceof State"); // ii. Return y.

                return y;
              }; // d. Call m(x, d) and let r be its result.


              const r = m(x, d); // e. If r is failure, return failure.

              if (r === 'failure') {
                return 'failure';
              } // f. Let y be r's State.


              const y = r; // g. Let cap be y's captures List.

              const cap = y.captures; // h. Let xe be x's endIndex.

              const xe = x.endIndex; // i. Let z be the State (xe, cap).

              const z = new State(xe, cap); // j. Call c(z) and return its result.

              return c(z);
            };
          }

        case '?!':
          {
            // 1. Evaluate Disjunction with +1 as its direction argument to obtain a Matcher m.
            const m = Evaluate(Disjunction, +1); // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:

            return (x, c) => {
              // a. Assert: x is a State.
              Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

              Assert(isContinuation(c), "isContinuation(c)"); // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:

              const d = y => {
                // i. Assert: y is a State.
                Assert(y instanceof State, "y instanceof State"); // ii. Return y.

                return y;
              }; // d. Call m(x, d) and let r be its result.


              const r = m(x, d); // e. If r is not failure, return failure.

              if (r !== 'failure') {
                return 'failure';
              } // f. Call c(x) and return its result.


              return c(x);
            };
          }

        case '?<=':
          {
            // 1. Evaluate Disjunction with -1 as its direction argument to obtain a Matcher m.
            const m = Evaluate(Disjunction, -1); // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:

            return (x, c) => {
              // a. Assert: x is a State.
              Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

              Assert(isContinuation(c), "isContinuation(c)"); // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:

              const d = y => {
                // i. Assert: y is a State.
                Assert(y instanceof State, "y instanceof State"); // ii. Return y.

                return y;
              }; // d. Call m(x, d) and let r be its result.


              const r = m(x, d); // e. If r is failure, return failure.

              if (r === 'failure') {
                return 'failure';
              } // f. Let y be r's State.


              const y = r; // g. Let cap be y's captures List.

              const cap = y.captures; // h. Let xe be x's endIndex.

              const xe = x.endIndex; // i. Let z be the State (xe, cap).

              const z = new State(xe, cap); // j. Call c(z) and return its result.

              return c(z);
            };
          }

        case '?<!':
          {
            // 1. Evaluate Disjunction with -1 as its direction argument to obtain a Matcher m.
            const m = Evaluate(Disjunction, -1); // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:

            return (x, c) => {
              // a. Assert: x is a State.
              Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

              Assert(isContinuation(c), "isContinuation(c)"); // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:

              const d = y => {
                // i. Assert: y is a State.
                Assert(y instanceof State, "y instanceof State"); // ii. Return y.

                return y;
              }; // d. Call m(x, d) and let r be its result.


              const r = m(x, d); // e. If r is not failure, return failure.

              if (r !== 'failure') {
                return 'failure';
              } // f. Call c(x) and return its result.


              return c(x);
            };
          }

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('Evaluate_Assertion', subtype);
      }
    } // #sec-runtime-semantics-wordcharacters-abstract-operation

    function WordCharacters() {
      // 1. Let A be a set of characters containing the sixty-three characters:
      //   a b c d e f g h i j k l m n o p q r s t u v w x y z
      //   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
      //   0 1 2 3 4 5 6 7 8 9 _
      // 2. Let U be an empty set.
      // 3. For each character c not in set A where Canonicalize(c) is in A, add c to U.
      // 4. Assert: Unless Unicode and IgnoreCase are both true, U is empty.
      // 5. Add the characters in set U to set A.
      // Return A.
      const A = new ConcreteCharSet(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '_'].map(c => c.codePointAt(0)));

      if (Unicode && IgnoreCase) {
        return new VirtualCharSet(c => {
          if (A.has(c)) {
            return true;
          }

          if (A.has(Canonicalize(c))) {
            return true;
          }

          return false;
        });
      }

      return A;
    } // #sec-runtime-semantics-iswordchar-abstract-operation

    function IsWordChar(e) {
      // 1. If e is -1 or e is InputLength, return false.
      if (e === -1 || e === InputLength) {
        return false;
      } // 2. Let c be the character Input[e].


      const c = Input[e]; // 3. Let wordChars be the result of ! WordCharacters().

      let _temp3 = WordCharacters();

      Assert(!(_temp3 instanceof AbruptCompletion), "WordCharacters()" + ' returned an abrupt completion');

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      const wordChars = _temp3; // 4. If c is in wordChars, return true.

      if (wordChars.has(c)) {
        return true;
      } // 5. Return false.


      return false;
    } // #sec-quantifier

    function Evaluate_Quantifier({
      QuantifierPrefix,
      greedy
    }) {
      switch (QuantifierPrefix) {
        case '*':
          return [0, Infinity, greedy];

        case '+':
          return [1, Infinity, greedy];

        case '?':
          return [0, 1, greedy];
      }

      const {
        DecimalDigits_a,
        DecimalDigits_b
      } = QuantifierPrefix;
      return [DecimalDigits_a, DecimalDigits_b || DecimalDigits_a, greedy];
    } // #sec-atom

    function Evaluate_Atom(Atom, direction) {
      switch (true) {
        case !!Atom.PatternCharacter:
          {
            // 1. Let ch be the character matched by PatternCharacter.
            const ch = Atom.PatternCharacter.codePointAt(0); // 2. Let A be a one-element CharSet containing the character ch.

            const A = new ConcreteCharSet([Canonicalize(ch)]); // 3. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.

            return CharacterSetMatcher(A, false, direction);
          }

        case Atom.subtype === '.':
          {
            let A; // 1. If DotAll is true, then

            if (DotAll) {
              // a. Let A be the set of all characters.
              A = new VirtualCharSet(_c => true);
            } else {
              // 2. Otherwise, let A be the set of all characters except LineTerminator.
              A = new VirtualCharSet(c => !isLineTerminator(String.fromCodePoint(c)));
            } // 3. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.


            return CharacterSetMatcher(A, false, direction);
          }

        case !!Atom.CharacterClass:
          {
            // 1. Evaluate CharacterClass to obtain a CharSet A and a Boolean invert.
            const {
              A,
              invert
            } = Evaluate(Atom.CharacterClass); // 2. Call CharacterSetMatcher(A, invert, direction) and return its Matcher result.

            return CharacterSetMatcher(A, invert, direction);
          }

        case Atom.capturing:
          {
            // 1. Evaluate Disjunction with argument direction to obtain a Matcher m.
            const m = Evaluate(Atom.Disjunction, direction); // 2. Let parenIndex be the number of left-capturing parentheses in the entire regular expression
            //    that occur to the left of this Atom. This is the total number of Atom :: `(` GroupSpecifier Disjunction `)`
            //    Parse Nodes prior to or enclosing this Atom.

            const parenIndex = Atom.capturingParenthesesBefore; // 3. Return a new Matcher with parameters (x, c) that captures direction, m, and parenIndex and performs the following steps when called:

            return (x, c) => {
              // a. Assert: x is a State.
              Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

              Assert(isContinuation(c), "isContinuation(c)"); // c. Let d be a new Continuation with parameters (y) that captures x, c, direction, and parenIndex and performs the following steps when called:

              const d = y => {
                // i. Assert: y is a State.
                Assert(y instanceof State, "y instanceof State"); // ii. Let cap be a copy of y's captures List.

                const cap = [...y.captures]; // iii. Let xe be x's endIndex.

                const xe = x.endIndex; // iv. Let ye be y's endIndex.

                const ye = y.endIndex;
                let s; // v. If direction is equal to +1, then

                if (direction === +1) {
                  // 1. Assert: xe ≤ ye.
                  Assert(xe <= ye, "xe <= ye");

                  if (exports.surroundingAgent.feature('regexp-match-indices')) {
                    // 2. Let r be the Range (xe, ye).
                    s = new Range(xe, ye);
                  } else {
                    // 2. Let s be a new List whose elements are the characters of Input at indices xe (inclusive) through ye (exclusive).
                    s = Input.slice(xe, ye);
                  }
                } else {
                  // vi. Else,
                  // 1. Assert: direction is equal to -1.
                  Assert(direction === -1, "direction === -1"); // 2. Assert: ye ≤ xe.

                  Assert(ye <= xe, "ye <= xe");

                  if (exports.surroundingAgent.feature('regexp-match-indices')) {
                    // 3. Let r be the Range (ye, xe).
                    s = new Range(ye, xe);
                  } else {
                    // 3. Let s be a new List whose elements are the characters of Input at indices ye (inclusive) through xe (exclusive).
                    s = Input.slice(ye, xe);
                  }
                } // vii. Set cap[parenIndex + 1] to s.


                cap[parenIndex + 1] = s; // viii. Let z be the State (ye, cap).

                const z = new State(ye, cap); // ix. Call c(z) and return its result.

                return c(z);
              }; // d. Call m(x, d) and return its result.


              return m(x, d);
            };
          }

        case !!Atom.Disjunction:
          return Evaluate(Atom.Disjunction, direction);

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('Evaluate_Atom', Atom);
      }
    } // #sec-runtime-semantics-charactersetmatcher-abstract-operation

    function CharacterSetMatcher(A, invert, direction) {
      // 1. Return a new Matcher with parameters (x, c) that captures A, invert, and direction and performs the following steps when called:
      return (x, c) => {
        // a. Assert: x is a State.
        Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

        Assert(isContinuation(c), "isContinuation(c)"); // c. Let e be x's endIndex.

        const e = x.endIndex; // d. Let f be e + direction.

        const f = e + direction; // e. If f < 0 or f > InputLength, return failure.

        if (f < 0 || f > InputLength) {
          return 'failure';
        } // f. Let index be min(e, f).


        const index = Math.min(e, f); // g. Let ch be the character Input[index].

        const ch = Input[index]; // h. Let cc be Canonicalize(ch).

        const cc = Canonicalize(ch); // i. If invert is false, then

        if (invert === false) {
          // i. If there does not exist a member a of set A such that Canonicalize(a) is cc, return failure.
          if (!A.has(cc)) {
            return 'failure';
          }
        } else {
          // j. Else
          // i. Assert: invert is true.
          Assert(invert === true, "invert === true"); // ii. If there exists a member a of set A such that Canonicalize(a) is cc, return failure.

          if (A.has(cc)) {
            return 'failure';
          }
        } // k. Let cap be x's captures List.


        const cap = x.captures; // Let y be the State (f, cap).

        const y = new State(f, cap); // Call c(y) and return its result.

        return c(y);
      };
    } // #sec-runtime-semantics-canonicalize-ch

    function Canonicalize(ch) {
      // 1. If IgnoreCase is false, return ch.
      if (IgnoreCase === false) {
        return ch;
      } // 2. If Unicode is true, then


      if (Unicode === true) {
        const s = String.fromCodePoint(ch); // a. If the file CaseFolding.txt of the Unicode Character Database provides a simple or common case folding mapping for ch, return the result of applying that mapping to ch.

        if (symbols$1.has(s)) {
          return symbols$1.get(s).codePointAt(0);
        }

        if (symbols.has(s)) {
          return symbols.get(s).codePointAt(0);
        } // b. Return ch.


        return ch;
      } else {
        // 3. Else
        // a. Assert: ch is a UTF-16 code unit.
        // b. Let s be the String value consisting of the single code unit ch.
        const s = String.fromCodePoint(ch); // c. Let u be the same result produced as if by performing the algorithm for String.prototype.toUpperCase using s as the this value.

        const u = s.toUpperCase(); // d. Assert: Type(u) is String.

        Assert(typeof u === 'string', "typeof u === 'string'"); // e. If u does not consist of a single code unit, return ch.

        if (u.length !== 1) {
          return ch;
        } // f. Let cu be u's single code unit element.


        const cu = u.codePointAt(0); // g. If the numeric value of ch ≥ 128 and the numeric value of cu < 128, return ch.

        if (ch >= 128 && cu < 128) {
          return ch;
        } // h. Return cu.


        return cu;
      }
    } // #sec-atomescape

    function Evaluate_AtomEscape(AtomEscape, direction) {
      switch (true) {
        case !!AtomEscape.DecimalEscape:
          {
            // 1. Evaluate DecimalEscape to obtain an integer n.
            const n = Evaluate(AtomEscape.DecimalEscape); // 2. Assert: n ≤ NcapturingParens.

            Assert(n <= NcapturingParens, "n <= NcapturingParens"); // 3. Call BackreferenceMatcher(n, direction) and return its Matcher result.

            return BackreferenceMatcher(n, direction);
          }

        case !!AtomEscape.CharacterEscape:
          {
            // 1. Evaluate CharacterEscape to obtain a character ch.
            const ch = Evaluate(AtomEscape.CharacterEscape); // 2. Let A be a one-element CharSet containing the character ch.

            const A = new ConcreteCharSet([Canonicalize(ch)]); // 3. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.

            return CharacterSetMatcher(A, false, direction);
          }

        case !!AtomEscape.CharacterClassEscape:
          {
            // 1. Evaluate CharacterClassEscape to obtain a CharSet A.
            const A = Evaluate(AtomEscape.CharacterClassEscape); // 2. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.

            return CharacterSetMatcher(A, false, direction);
          }

        case !!AtomEscape.GroupName:
          {
            // 1. Search the enclosing Pattern for an instance of a GroupSpecifier for a RegExpIdentifierName which has a StringValue equal to the StringValue of the RegExpIdentifierName contained in GroupName.
            // 2. Assert: A unique such GroupSpecifier is found.
            // 3. Let parenIndex be the number of left-capturing parentheses in the entire regular expression that occur to the left of the located GroupSpecifier. This is the total number of Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes prior to or enclosing the located GroupSpecifier.
            const parenIndex = Pattern.groupSpecifiers.get(AtomEscape.GroupName);
            Assert(parenIndex !== undefined, "parenIndex !== undefined"); // 4. Call BackreferenceMatcher(parenIndex, direction) and return its Matcher result.

            return BackreferenceMatcher(parenIndex + 1, direction);
          }

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('Evaluate_AtomEscape', AtomEscape);
      }
    } // #sec-backreference-matcher

    function BackreferenceMatcher(n, direction) {
      // 1. Return a new Matcher with parameters (x, c) that captures n and direction and performs the following steps when called:
      return (x, c) => {
        // a. Assert: x is a State.
        Assert(x instanceof State, "x instanceof State"); // b. Assert: c is a Continuation.

        Assert(isContinuation(c), "isContinuation(c)"); // c. Let cap be x's captures List.

        const cap = x.captures; // d. Let s be cap[n].

        const s = cap[n]; // e. If s is undefined, return c(x).

        if (s === Value.undefined) {
          return c(x);
        } // f. Let e be x's endIndex.


        const e = x.endIndex;
        let len;

        if (exports.surroundingAgent.feature('regexp-match-indices')) {
          // g. Let rs be r's startIndex.
          const rs = s.startIndex; // h. Let re be r's endIndex.

          const re = s.endIndex; // i. Let len be the number of elements in re - rs.

          len = re - rs;
        } else {
          // g. Let len be the number of elements in s.
          len = s.length;
        } // h. Let f be e + direction × len.


        const f = e + direction * len; // i. If f < 0 or f > InputLength, return failure.

        if (f < 0 || f > InputLength) {
          return 'failure';
        } // j. Let g be min(e, f).


        const g = Math.min(e, f); // k. If there exists an integer i between 0 (inclusive) and len (exclusive) such that Canonicalize(s[i]) is not the same character value as Canonicalize(Input[g + i]), return failure.

        for (let i = 0; i < len; i += 1) {
          const part = exports.surroundingAgent.feature('regexp-match-indices') ? Input[s.startIndex + i] : s[i];

          if (Canonicalize(part) !== Canonicalize(Input[g + i])) {
            return 'failure';
          }
        } // l. Let y be the State (f, cap).


        const y = new State(f, cap); // m. Call c(y) and return its result.

        return c(y);
      };
    } // #sec-characterescape

    function Evaluate_CharacterEscape(CharacterEscape) {
      // 1. Let cv be the CharacterValue of this CharacterEscape.
      const cv = CharacterValue(CharacterEscape); // 2. Return the character whose character value is cv.

      return cv;
    } // #sec-decimalescape

    function Evaluate_DecimalEscape(DecimalEscape) {
      return DecimalEscape.value;
    } // #sec-characterclassescape

    function Evaluate_CharacterClassEscape(node) {
      switch (node.value) {
        case 'd':
          // 1. Return the ten-element set of characters containing the characters 0 through 9 inclusive.
          return new ConcreteCharSet(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(c => c.codePointAt(0)));

        case 'D':
          // 1. Return the set of all characters not included in the set returned by CharacterClassEscape :: `d`.
          return new VirtualCharSet(c => !isDecimalDigit(String.fromCodePoint(c)));

        case 's':
          // 1. Return the set of characters containing the characters that are on the right-hand side of the WhiteSpace or LineTerminator productions.
          return new VirtualCharSet(c => {
            const s = String.fromCodePoint(c);
            return isWhitespace(s) || isLineTerminator(s);
          });

        case 'S':
          // 1. Return the set of all characters not included in the set returned by CharacterClassEscape :: `s`.
          return new VirtualCharSet(c => {
            const s = String.fromCodePoint(c);
            return !isWhitespace(s) && !isLineTerminator(s);
          });

        case 'w':
          // 1. Return the set of all characters returned by WordCharacters().
          return WordCharacters();

        case 'W':
          {
            // 1. Return the set of all characters not included in the set returned by CharacterClassEscape :: `w`.
            const s = WordCharacters();
            return new VirtualCharSet(c => !s.has(c));
          }

        case 'p':
          // 1. Return the CharSet containing all Unicode code points included in the CharSet returned by UnicodePropertyValueExpression.
          return Evaluate(node.UnicodePropertyValueExpression);

        case 'P':
          {
            // 1. Return the CharSet containing all Unicode code points not included in the CharSet returned by UnicodePropertyValueExpression.
            const s = Evaluate(node.UnicodePropertyValueExpression);
            return new VirtualCharSet(c => !s.has(c));
          }

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('Evaluate_CharacterClassEscape', node);
      }
    } // UnicodePropertyValueExpression ::

    function Evaluate_UnicodePropertyValueExpression(UnicodePropertyValueExpression) {
      if (UnicodePropertyValueExpression.LoneUnicodePropertyNameOrValue) {
        // 1. Let s be SourceText of LoneUnicodePropertyNameOrValue.
        const s = UnicodePropertyValueExpression.LoneUnicodePropertyNameOrValue; // 2. If ! UnicodeMatchPropertyValue(General_Category, s) is identical to a List of Unicode code points that is the name of a Unicode general category or general category alias listed in the “Property value and aliases” column of Table 57, then

        let _temp4 = (UnicodeMatchPropertyValue('General_Category', s) in UnicodeGeneralCategoryValues);

        Assert(!(_temp4 instanceof AbruptCompletion), "UnicodeMatchPropertyValue('General_Category', s) in UnicodeGeneralCategoryValues" + ' returned an abrupt completion');

        if (_temp4 instanceof Completion) {
          _temp4 = _temp4.Value;
        }

        if (_temp4) {
          // a. Return the CharSet containing all Unicode code points whose character database definition includes the property “General_Category” with value s.
          return new ConcreteCharSet(getUnicodePropertyValueSet('General_Category', s));
        } // 3. Let p be ! UnicodeMatchProperty(s).


        let _temp5 = UnicodeMatchProperty(s);

        Assert(!(_temp5 instanceof AbruptCompletion), "UnicodeMatchProperty(s)" + ' returned an abrupt completion');

        if (_temp5 instanceof Completion) {
          _temp5 = _temp5.Value;
        }

        const p = _temp5; // 4. Assert: p is a binary Unicode property or binary property alias listed in the “Property name and aliases” column of Table 56.

        Assert(p in BinaryUnicodeProperties, "p in BinaryUnicodeProperties"); // 5. Return the CharSet containing all Unicode code points whose character database definition includes the property p with value “True”.

        return new ConcreteCharSet(getUnicodePropertyValueSet(p));
      } // 1. Let ps be SourceText of UnicodePropertyName.


      const ps = UnicodePropertyValueExpression.UnicodePropertyName; // 2. Let p be ! UnicodeMatchProperty(ps).

      let _temp6 = UnicodeMatchProperty(ps);

      Assert(!(_temp6 instanceof AbruptCompletion), "UnicodeMatchProperty(ps)" + ' returned an abrupt completion');

      if (_temp6 instanceof Completion) {
        _temp6 = _temp6.Value;
      }

      const p = _temp6; // 3. Assert: p is a Unicode property name or property alias listed in the “Property name and aliases” column of Table 55.

      Assert(p in NonbinaryUnicodeProperties, "p in NonbinaryUnicodeProperties"); // 4. Let vs be SourceText of UnicodePropertyValue.

      const vs = UnicodePropertyValueExpression.UnicodePropertyValue; // 5. Let v be ! UnicodeMatchPropertyValue(p, vs).

      let _temp7 = UnicodeMatchPropertyValue(p, vs);

      Assert(!(_temp7 instanceof AbruptCompletion), "UnicodeMatchPropertyValue(p, vs)" + ' returned an abrupt completion');

      if (_temp7 instanceof Completion) {
        _temp7 = _temp7.Value;
      }

      const v = _temp7; // 6. Return the CharSet containing all Unicode code points whose character database definition includes the property p with value v.

      return new ConcreteCharSet(getUnicodePropertyValueSet(p, v));
    } // #sec-characterclass
    //  CharacterClass ::
    //    `[` ClassRanges `]`
    //    `[` `^` ClassRanges `]`


    function Evaluate_CharacterClass({
      invert,
      ClassRanges
    }) {
      let A = new ConcreteCharSet([]);

      for (const range of ClassRanges) {
        if (Array.isArray(range)) {
          const B = Evaluate(range[0]);
          const C = Evaluate(range[1]);
          const D = CharacterRange(B, C);
          A = A.union(D);
        } else {
          A = A.union(Evaluate(range));
        }
      }

      return {
        A,
        invert
      };
    } // #sec-runtime-semantics-characterrange-abstract-operation

    function CharacterRange(A, B) {
      // 1. Assert: A and B each contain exactly one character.
      Assert(A.size === 1 && B.size === 1, "A.size === 1 && B.size === 1"); // 2. Let a be the one character in CharSet A.

      const a = A.first(); // 3. Let b be the one character in CharSet B.

      const b = B.first(); // 4. Let i be the character value of character a.

      const i = a; // 5. Let j be the character value of character b.

      const j = b; // 6. Assert: i ≤ j.

      Assert(i <= j, "i <= j"); // 7. Return the set containing all characters numbered i through j, inclusive.

      const set = new Set();

      for (let k = i; k <= j; k += 1) {
        set.add(Canonicalize(k));
      }

      return new ConcreteCharSet(set);
    } // #sec-classatom

    function Evaluate_ClassAtom(ClassAtom) {
      switch (true) {
        case !!ClassAtom.SourceCharacter:
          // 1. Return the CharSet containing the character matched by SourceCharacter.
          return new ConcreteCharSet([Canonicalize(ClassAtom.SourceCharacter.codePointAt(0))]);

        case ClassAtom.value === '-':
          // 1. Return the CharSet containing the single character - U+002D (HYPHEN-MINUS).
          return new ConcreteCharSet([0x002D]);

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('Evaluate_ClassAtom', ClassAtom);
      }
    } // #sec-classescape

    function Evaluate_ClassEscape(ClassEscape) {
      switch (true) {
        case ClassEscape.value === 'b':
        case ClassEscape.value === '-':
        case !!ClassEscape.CharacterEscape:
          {
            // 1. Let cv be the CharacterValue of this ClassEscape.
            const cv = CharacterValue(ClassEscape); // 2. Let c be the character whose character value is cv.

            const c = cv; // 3. Return the CharSet containing the single character c.

            return new ConcreteCharSet([Canonicalize(c)]);
          }

        /*istanbul ignore next*/
        default:
          throw new OutOfRange('Evaluate_ClassEscape', ClassEscape);
      }
    }
  }

  function StringPad(O, maxLength, fillString, placement) {
    Assert(placement === 'start' || placement === 'end', "placement === 'start' || placement === 'end'");

    let _temp = ToString(O);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const S = _temp;

    let _temp2 = ToLength(maxLength);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const intMaxLength = _temp2.numberValue();

    const stringLength = S.stringValue().length;

    if (intMaxLength <= stringLength) {
      return S;
    }

    let filler;

    if (fillString === Value.undefined) {
      filler = ' ';
    } else {
      let _temp3 = ToString(fillString);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      filler = _temp3.stringValue();
    }

    if (filler === '') {
      return S;
    }

    const fillLen = intMaxLength - stringLength;
    const stringFiller = filler.repeat(Math.ceil(fillLen / filler.length));
    const truncatedStringFiller = stringFiller.slice(0, fillLen);

    if (placement === 'start') {
      return new Value(truncatedStringFiller + S.stringValue());
    } else {
      return new Value(S.stringValue() + truncatedStringFiller);
    }
  }

  function TrimString(string, where) {
    let _temp = RequireObjectCoercible(string);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const str = _temp;

    let _temp2 = ToString(str);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const S = _temp2.stringValue();

    let T;

    if (where === 'start') {
      T = S.trimStart();
    } else if (where === 'end') {
      T = S.trimEnd();
    } else {
      Assert(where === 'start+end', "where === 'start+end'");
      T = S.trim();
    }

    return new Value(T);
  }

  // NewTarget : `new` `.` `target`

  function Evaluate_NewTarget() {
    // 1. Return GetNewTarget().
    return GetNewTarget();
  }

  //   AwaitExpression : `await` UnaryExpression

  function* Evaluate_AwaitExpression({
    UnaryExpression
  }) {
    // 1. Let exprRef be the result of evaluating UnaryExpression.
    const exprRef = yield* Evaluate(UnaryExpression); // 2. Let value be ? GetValue(exprRef).

    let _temp = GetValue(exprRef);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const value = _temp; // 3. Return ? Await(value).

    return yield* Await(value);
  }

  //   ClassDeclaration :
  //     `class` BindingIdentifier ClassTail
  //     `class` ClassTail

  function* BindingClassDeclarationEvaluation(ClassDeclaration) {
    const {
      BindingIdentifier,
      ClassTail
    } = ClassDeclaration;

    if (!BindingIdentifier) {
      let _temp = yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, new Value('default'));
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // 1. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments undefined and "default".
      const value = _temp; // 2. Set value.[[SourceText]] to the source text matched by ClassDeclaration.

      value.SourceText = sourceTextMatchedBy(ClassDeclaration); // 3. Return value.

      return value;
    } // 1. Let className be StringValue of BindingIdentifier.


    const className = StringValue(BindingIdentifier); // 2. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments className and className.

    let _temp2 = yield* ClassDefinitionEvaluation(ClassTail, className, className);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const value = _temp2; // 3. Set value.[[SourceText]] to the source text matched by ClassDeclaration.

    value.SourceText = sourceTextMatchedBy(ClassDeclaration); // 4. Let env be the running execution context's LexicalEnvironment.

    const env = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 5. Perform ? InitializeBoundName(className, value, env).

    let _temp3 = InitializeBoundName(className, value, env);

    if (_temp3 instanceof AbruptCompletion) {
      return _temp3;
    }

    if (_temp3 instanceof Completion) {
      _temp3 = _temp3.Value;
    }

    return value;
  } // #sec-class-definitions-runtime-semantics-evaluation
  //   ClassDeclaration : `class` BindingIdentifier ClassTAil

  function* Evaluate_ClassDeclaration(ClassDeclaration) {
    let _temp4 = yield* BindingClassDeclarationEvaluation(ClassDeclaration);

    if (_temp4 instanceof AbruptCompletion) {
      return _temp4;
    }

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    return NormalCompletion(undefined);
  }

  //   WithStatement : `with` `(` Expression `)` Statement

  function* Evaluate_WithStatement({
    Expression,
    Statement
  }) {
    // 1. Let val be the result of evaluating Expression.
    const val = yield* Evaluate(Expression); // 2. Let obj be ? ToObject(? GetValue(val)).

    let _temp2 = GetValue(val);
    /* istanbul ignore if */


    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }
    /* istanbul ignore if */


    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    let _temp = ToObject(_temp2);

    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const obj = _temp; // 3. Let oldEnv be the running execution context's LexicalEnvironment.

    const oldEnv = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Let newEnv be NewObjectEnvironment(obj, oldEnv).

    const newEnv = NewObjectEnvironment(obj, oldEnv); // 5. Set the withEnvironment flag of newEnv's EnvironmentRecord to true.

    newEnv.withEnvironment = true; // 6. Set the running execution context's LexicalEnvironment to newEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = newEnv; // 7. Let C be the result of evaluating Statement.

    const C = EnsureCompletion(yield* Evaluate(Statement)); // 8. Set the running execution context's LexicalEnvironment to oldEnv.

    exports.surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv; // 9. Return Completion(UpdateEmpty(C, undefined)).

    return Completion(UpdateEmpty(C, Value.undefined));
  }

  // Module :
  //   [empty]
  //   ModuleBody

  function* Evaluate_Module({
    ModuleBody
  }) {
    if (!ModuleBody) {
      return NormalCompletion(Value.undefined);
    }

    return yield* Evaluate(ModuleBody);
  }

  // ModuleBody : ModuleItemList

  function Evaluate_ModuleBody({
    ModuleItemList
  }) {
    return Evaluate_StatementList(ModuleItemList);
  }

  // ModuleItem : ImportDeclaration

  function Evaluate_ImportDeclaration(_ImportDeclaration) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  //   ExportDeclaration :
  //     `export` ExportFromClause FromClause `;`
  //     `export` NamedExports `;`
  //     `export` VariableDeclaration
  //     `export` Declaration
  //     `export` `default` HoistableDeclaration
  //     `export` `default` ClassDeclaration
  //     `export` `default` AssignmentExpression `;`

  function* Evaluate_ExportDeclaration(ExportDeclaration) {
    const {
      FromClause,
      NamedExports,
      VariableStatement,
      Declaration,
      default: isDefault,
      HoistableDeclaration,
      ClassDeclaration,
      AssignmentExpression
    } = ExportDeclaration;

    if (FromClause || NamedExports) {
      // 1. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    }

    if (VariableStatement) {
      // 1. Return the result of evaluating VariableStatement.
      return yield* Evaluate(VariableStatement);
    }

    if (Declaration) {
      // 1. Return the result of evaluating Declaration.
      return yield* Evaluate(ExportDeclaration.Declaration);
    }

    if (!isDefault) {
      throw new OutOfRange('Evaluate_ExportDeclaration', ExportDeclaration);
    }

    if (HoistableDeclaration) {
      // 1. Return the result of evaluating HoistableDeclaration.
      return yield* Evaluate(HoistableDeclaration);
    }

    if (ClassDeclaration) {
      let _temp = yield* BindingClassDeclarationEvaluation(ClassDeclaration);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // 1. Let value be ? BindingClassDeclarationEvaluation of ClassDeclaration.
      const value = _temp; // 2. Let className be the sole element of BoundNames of ClassDeclaration.

      const className = BoundNames(ClassDeclaration)[0]; // If className is ~default~, then

      if (className === 'default') {
        // a. Let env be the running execution context's LexicalEnvironment.
        const env = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // b. Perform ? InitializeBoundName(~default~, value, env).

        let _temp2 = InitializeBoundName('default', value, env);

        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }
      } // 3. Return NormalCompletion(empty).


      return NormalCompletion(undefined);
    }

    if (AssignmentExpression) {
      let value; // 1. If IsAnonymousFunctionDefinition(AssignmentExpression) is true, then

      if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
        // a. Let value be NamedEvaluation of AssignmentExpression with argument "default".
        value = yield* NamedEvaluation(AssignmentExpression, new Value('default'));
      } else {
        // 2. Else,
        // a. Let rhs be the result of evaluating AssignmentExpression.
        const rhs = yield* Evaluate(AssignmentExpression); // a. Let value be ? GetValue(rhs).

        let _temp3 = GetValue(rhs);

        if (_temp3 instanceof AbruptCompletion) {
          return _temp3;
        }

        if (_temp3 instanceof Completion) {
          _temp3 = _temp3.Value;
        }

        value = _temp3;
      } // 3. Let env be the running execution context's LexicalEnvironment.


      const env = exports.surroundingAgent.runningExecutionContext.LexicalEnvironment; // 4. Perform ? InitializeBoundName(~default~, value, env).

      let _temp4 = InitializeBoundName('default', value, env);

      if (_temp4 instanceof AbruptCompletion) {
        return _temp4;
      }

      if (_temp4 instanceof Completion) {
        _temp4 = _temp4.Value;
      }

      return NormalCompletion(undefined);
    }

    throw new OutOfRange('Evaluate_ExportDeclaration', ExportDeclaration);
  }

  //   OptionalExpression :
  //     MemberExpression OptionalChain
  //     CallExpression OptionalChain
  //     OptionalExpression OptionalChain

  function* Evaluate_OptionalExpression({
    MemberExpression,
    OptionalChain
  }) {
    // 1. Let baseReference be the result of evaluating MemberExpression.
    const baseReference = yield* Evaluate(MemberExpression); // 2. Let baseValue be ? GetValue(baseReference).

    let _temp = GetValue(baseReference);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const baseValue = _temp; // 3. If baseValue is undefined or null, then

    if (baseValue === Value.undefined || baseValue === Value.null) {
      // a. Return undefined.
      return Value.undefined;
    } // 4. Return the result of performing ChainEvaluation of OptionalChain with arguments baseValue and baseReference.


    return yield* ChainEvaluation(OptionalChain, baseValue, baseReference);
  } // #sec-optional-chaining-chain-evaluation
  //   OptionalChain :
  //     `?.` Arguments
  //     `?.` `[` Expression `]`
  //     `?.` IdentifierName
  //     OptionalChain Arguments
  //     OptionalChain `[` Expression `]`
  //     OptionalChain `.` IdentifierName

  function* ChainEvaluation(node, baseValue, baseReference) {
    const {
      OptionalChain,
      Arguments,
      Expression,
      IdentifierName
    } = node;

    if (Arguments) {
      if (OptionalChain) {
        // 1. Let optionalChain be OptionalChain.
        const optionalChain = OptionalChain; // 2. Let newReference be ? ChainEvaluation of optionalChain with arguments baseValue and baseReference.

        let _temp2 = yield* ChainEvaluation(optionalChain, baseValue, baseReference);

        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }

        const newReference = _temp2; // 3. Let newValue be ? GetValue(newReference).

        let _temp3 = GetValue(newReference);

        if (_temp3 instanceof AbruptCompletion) {
          return _temp3;
        }

        if (_temp3 instanceof Completion) {
          _temp3 = _temp3.Value;
        }

        const newValue = _temp3; // 4. Let thisChain be this OptionalChain.

        const tailCall = IsInTailPosition(); // 6. Return ? EvaluateCall(newValue, newReference, Arguments, tailCall).

        return yield* EvaluateCall(newValue, newReference, Arguments, tailCall);
      } // 1. Let thisChain be this OptionalChain.

      const tailCall = IsInTailPosition(); // 3. Return ? EvaluateCall(baseValue, baseReference, Arguments, tailCall).

      return yield* EvaluateCall(baseValue, baseReference, Arguments, tailCall);
    }

    if (Expression) {
      if (OptionalChain) {
        // 1. Let optionalChain be OptionalChain.
        const optionalChain = OptionalChain; // 2. Let newReference be ? ChainEvaluation of optionalChain with arguments baseValue and baseReference.

        let _temp4 = yield* ChainEvaluation(optionalChain, baseValue, baseReference);

        if (_temp4 instanceof AbruptCompletion) {
          return _temp4;
        }

        if (_temp4 instanceof Completion) {
          _temp4 = _temp4.Value;
        }

        const newReference = _temp4; // 3. Let newValue be ? GetValue(newReference).

        let _temp5 = GetValue(newReference);

        if (_temp5 instanceof AbruptCompletion) {
          return _temp5;
        }

        if (_temp5 instanceof Completion) {
          _temp5 = _temp5.Value;
        }

        const newValue = _temp5; // 4. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.

        const strict = node.strict; // 5. Return ? EvaluatePropertyAccessWithExpressionKey(newValue, Expression, strict).

        return yield* EvaluatePropertyAccessWithExpressionKey(newValue, Expression, strict);
      } // 1. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.


      const strict = node.strict; // 2. Return ? EvaluatePropertyAccessWithExpressionKey(baseValue, Expression, strict).

      return yield* EvaluatePropertyAccessWithExpressionKey(baseValue, Expression, strict);
    }

    if (IdentifierName) {
      if (OptionalChain) {
        // 1. Let optionalChain be OptionalChain.
        const optionalChain = OptionalChain; // 2. Let newReference be ? ChainEvaluation of optionalChain with arguments baseValue and baseReference.

        let _temp6 = yield* ChainEvaluation(optionalChain, baseValue, baseReference);

        if (_temp6 instanceof AbruptCompletion) {
          return _temp6;
        }

        if (_temp6 instanceof Completion) {
          _temp6 = _temp6.Value;
        }

        const newReference = _temp6; // 3. Let newValue be ? GetValue(newReference).

        let _temp7 = GetValue(newReference);

        if (_temp7 instanceof AbruptCompletion) {
          return _temp7;
        }

        if (_temp7 instanceof Completion) {
          _temp7 = _temp7.Value;
        }

        const newValue = _temp7; // 4. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.

        const strict = node.strict; // 5. Return ? EvaluatePropertyAccessWithIdentifierKey(newValue, IdentifierName, strict).

        return EvaluatePropertyAccessWithIdentifierKey(newValue, IdentifierName, strict);
      } // 1. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.


      const strict = node.strict; // 2. Return ? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict).

      return EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict);
    }

    throw new OutOfRange('ChainEvaluation', node);
  }

  ChainEvaluation.section = 'https://tc39.es/ecma262/#sec-optional-chaining-chain-evaluation';

  //   MemberExpression :
  //     MemberExpression TemplateLiteral

  function* Evaluate_TaggedTemplateExpression(node) {
    const {
      MemberExpression,
      TemplateLiteral
    } = node; // 1. Let tagRef be the result of evaluating MemberExpression.

    const tagRef = yield* Evaluate(MemberExpression); // 1. Let tagFunc be ? GetValue(tagRef).

    let _temp = GetValue(tagRef);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const tagFunc = _temp; // 1. Let thisCall be this MemberExpression.

    const tailCall = IsInTailPosition(); // 1. Return ? EvaluateCall(tagFunc, tagRef, TemplateLiteral, tailCall).

    return yield* EvaluateCall(tagFunc, tagRef, TemplateLiteral, tailCall);
  }

  function GetSubstitution(matched, str, position, captures, namedCaptures, replacement) {
    // 1. Assert: Type(matched) is String.
    Assert(Type(matched) === 'String', "Type(matched) === 'String'"); // 2. Let matchLength be the number of code units in matched.

    const matchLength = matched.stringValue().length; // 3. Assert: Type(str) is String.

    Assert(Type(str) === 'String', "Type(str) === 'String'"); // 4. Let stringLength be the number of code units in str.

    const stringLength = str.stringValue().length; // 5. Assert: ! IsNonNegativeInteger(position) is true.

    let _temp = IsNonNegativeInteger(position);

    Assert(!(_temp instanceof AbruptCompletion), "IsNonNegativeInteger(position)" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    Assert(_temp === Value.true, "X(IsNonNegativeInteger(position)) === Value.true"); // 6. Assert: position ≤ stringLength.

    Assert(position.numberValue() <= stringLength, "position.numberValue() <= stringLength"); // 7. Assert: captures is a possibly empty List of Strings.

    Assert(Array.isArray(captures) && captures.every(value => Type(value) === 'String' || Type(value) === 'Undefined'), "Array.isArray(captures) && captures.every((value) => Type(value) === 'String' || Type(value) === 'Undefined')"); // 8. Assert: Type(replacement) is String.

    Assert(Type(replacement) === 'String', "Type(replacement) === 'String'"); // 9. Let tailPos be position + matchLength.

    const tailPos = position.numberValue() + matchLength; // 10. Let m be the number of elements in captures.

    const m = captures.length; // 11. Let result be the String value derived from replacement by copying code unit elements from replacement
    //     to result while performing replacements as specified in Table 52. These $ replacements are done left-to-right,
    //     and, once such a replacement is performed, the new replacement text is not subject to further replacements.

    const replacementStr = replacement.stringValue();
    let result = '';
    let i = 0;

    while (i < replacementStr.length) {
      const currentChar = replacementStr[i];

      if (currentChar === '$' && i < replacementStr.length - 1) {
        const nextChar = replacementStr[i + 1];

        if (nextChar === '$') {
          result += '$';
          i += 2;
        } else if (nextChar === '&') {
          result += matched.stringValue();
          i += 2;
        } else if (nextChar === '`') {
          if (position.numberValue() === 0) ; else {
            result += str.stringValue().substring(0, position.numberValue());
          }

          i += 2;
        } else if (nextChar === '\'') {
          if (tailPos >= stringLength) ; else {
            result += str.stringValue().substring(tailPos);
          }

          i += 2;
        } else if ('123456789'.includes(nextChar) && (i === replacementStr.length - 2 || !'0123456789'.includes(replacementStr[i + 2]))) {
          const n = Number(nextChar);

          if (n <= m) {
            const capture = captures[n - 1];

            if (capture !== Value.undefined) {
              result += capture.stringValue();
            }
          } else {
            result += `$${nextChar}`;
          }

          i += 2;
        } else if (i < replacementStr.length - 2 && '0123456789'.includes(nextChar) && '0123456789'.includes(replacementStr[i + 2])) {
          const nextNextChar = replacementStr[i + 2];
          const n = Number(nextChar + nextNextChar);

          if (n !== 0 && n <= m) {
            const capture = captures[n - 1];

            if (capture !== Value.undefined) {
              result += capture.stringValue();
            }
          } else {
            result += `$${nextChar}${nextNextChar}`;
          }

          i += 3;
        } else if (nextChar === '<') {
          if (namedCaptures === Value.undefined) {
            result += '$<';
            i += 2;
          } else {
            Assert(Type(namedCaptures) === 'Object', "Type(namedCaptures) === 'Object'");
            const nextSign = replacementStr.indexOf('>', i);

            if (nextSign === -1) {
              result += '$<';
              i += 2;
            } else {
              const groupName = new Value(replacementStr.substring(i + 2, nextSign));

              let _temp2 = Get(namedCaptures, groupName);
              /* istanbul ignore if */


              if (_temp2 instanceof AbruptCompletion) {
                return _temp2;
              }
              /* istanbul ignore if */


              if (_temp2 instanceof Completion) {
                _temp2 = _temp2.Value;
              }

              const capture = _temp2;

              if (capture === Value.undefined) ; else {
                let _temp3 = ToString(capture);

                if (_temp3 instanceof AbruptCompletion) {
                  return _temp3;
                }

                if (_temp3 instanceof Completion) {
                  _temp3 = _temp3.Value;
                }

                result += _temp3.stringValue();
              }

              i = nextSign + 1;
            }
          }
        } else {
          result += '$';
          i += 1;
        }
      } else {
        result += currentChar;
        i += 1;
      }
    } // 12. Return result.


    return new Value(result);
  }

  //   ContinueStatement :
  //     `continue` `;`
  //     `continue` LabelIdentifier `;`

  function Evaluate_ContinueStatement({
    LabelIdentifier
  }) {
    if (!LabelIdentifier) {
      // 1. Return Completion { [[Type]]: continue, [[Value]]: empty, [[Target]]: empty }.
      return new Completion({
        Type: 'continue',
        Value: undefined,
        Target: undefined
      });
    } // 1. Let label be the StringValue of LabelIdentifier.


    const label = StringValue(LabelIdentifier); // 2. Return Completion { [[Type]]: continue, [[Value]]: empty, [[Target]]: label }.

    return new Completion({
      Type: 'continue',
      Value: undefined,
      Target: label
    });
  }

  function Evaluate_LabelledStatement(LabelledStatement) {
    // 1. Let newLabelSet be a new empty List.
    const newLabelSet = new ValueSet(); // 2. Return LabelledEvaluation of this LabelledStatement with argument newLabelSet.

    return LabelledEvaluation(LabelledStatement, newLabelSet);
  }

  //   StringNumericLiteral :::
  //     [empty]
  //     StrWhiteSpace
  //     StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt

  function MV_StringNumericLiteral(StringNumericLiteral) {
    return new Value(Number(StringNumericLiteral));
  }

  function ApplyStringOrNumericBinaryOperator(lval, opText, rval) {
    // 1. If opText is +, then
    if (opText === '+') {
      let _temp = ToPrimitive(lval);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // a. Let lprim be ? ToPrimitive(lval).
      const lprim = _temp; // b. Let rprim be ? ToPrimitive(rval).

      let _temp2 = ToPrimitive(rval);

      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      const rprim = _temp2; // c. If Type(lprim) is String or Type(rprim) is String, then

      if (Type(lprim) === 'String' || Type(rprim) === 'String') {
        let _temp3 = ToString(lprim);

        if (_temp3 instanceof AbruptCompletion) {
          return _temp3;
        }

        if (_temp3 instanceof Completion) {
          _temp3 = _temp3.Value;
        }

        // i. Let lstr be ? ToString(lprim).
        const lstr = _temp3; // ii. Let rstr be ? ToString(rprim).

        let _temp4 = ToString(rprim);

        if (_temp4 instanceof AbruptCompletion) {
          return _temp4;
        }

        if (_temp4 instanceof Completion) {
          _temp4 = _temp4.Value;
        }

        const rstr = _temp4; // iii. Return the string-concatenation of lstr and rstr.

        return new Value(lstr.stringValue() + rstr.stringValue());
      } // d. Set lval to lprim.


      lval = lprim; // e. Set rval to rprim.

      rval = rprim;
    } // 2. NOTE: At this point, it must be a numeric operation.
    // 3. Let lnum be ? ToNumeric(lval).


    let _temp5 = ToNumeric(lval);

    if (_temp5 instanceof AbruptCompletion) {
      return _temp5;
    }

    if (_temp5 instanceof Completion) {
      _temp5 = _temp5.Value;
    }

    const lnum = _temp5; // 4. Let rnum be ? ToNumeric(rval).

    let _temp6 = ToNumeric(rval);

    if (_temp6 instanceof AbruptCompletion) {
      return _temp6;
    }

    if (_temp6 instanceof Completion) {
      _temp6 = _temp6.Value;
    }

    const rnum = _temp6; // 5. If Type(lnum) is different from Type(rnum), throw a TypeError exception.

    if (Type(lnum) !== Type(rnum)) {
      return exports.surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
    } // 6. Let T be Type(lnum).


    const T = TypeForMethod(lnum); // 7. Let operation be the abstract operation associated with opText in the following table:

    const operation = {
      '**': T.exponentiate,
      '*': T.multiply,
      '/': T.divide,
      '%': T.remainder,
      '+': T.add,
      '-': T.subtract,
      '<<': T.leftShift,
      '>>': T.signedRightShift,
      '>>>': T.unsignedRightShift,
      '&': T.bitwiseAND,
      '^': T.bitwiseXOR,
      '|': T.bitwiseOR
    }[opText]; // 8. Return ? operation(lnum, rnum).

    return operation(lnum, rnum);
  }

  function* EvaluateStringOrNumericBinaryExpression(leftOperand, opText, rightOperand) {
    // 1. Let lref be the result of evaluating leftOperand.
    const lref = yield* Evaluate(leftOperand); // 2. Let lval be ? GetValue(lref).

    let _temp = GetValue(lref);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    const lval = _temp; // 3. Let rref be the result of evaluating rightOperand.

    const rref = yield* Evaluate(rightOperand); // 4. Let rval be ? GetValue(rref).

    let _temp2 = GetValue(rref);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const rval = _temp2; // 5. Return ? ApplyStringOrNumericBinaryOperator(lval, opText, rval).

    return ApplyStringOrNumericBinaryOperator(lval, opText, rval);
  }

  //   ImportMeta : `import` `.` `meta`

  function Evaluate_ImportMeta(_ImportMeta) {
    let _temp = GetActiveScriptOrModule();

    Assert(!(_temp instanceof AbruptCompletion), "GetActiveScriptOrModule()" + ' returned an abrupt completion');
    /* istanbul ignore if */

    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    // 1. Let module be ! GetActiveScriptOrModule().
    const module = _temp; // 2. Assert: module is a Source Text Module Record.

    Assert(module instanceof SourceTextModuleRecord, "module instanceof SourceTextModuleRecord"); // 3. Let importMeta be module.[[ImportMeta]].

    let importMeta = module.ImportMeta; // 4. If importMeta is empty, then

    if (importMeta === undefined) {
      let _temp2 = OrdinaryObjectCreate(Value.null);

      Assert(!(_temp2 instanceof AbruptCompletion), "OrdinaryObjectCreate(Value.null)" + ' returned an abrupt completion');

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      // a. Set importMeta to ! OrdinaryObjectCreate(null).
      importMeta = _temp2; // b. Let importMetaValues be ! HostGetImportMetaProperties(module).

      let _temp3 = HostGetImportMetaProperties(module);

      Assert(!(_temp3 instanceof AbruptCompletion), "HostGetImportMetaProperties(module)" + ' returned an abrupt completion');

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      const importMetaValues = _temp3; // c. For each Record { [[Key]], [[Value]] } p that is an element of importMetaValues, do

      for (const p of importMetaValues) {
        let _temp4 = CreateDataPropertyOrThrow(importMeta, p.Key, p.Value);

        Assert(!(_temp4 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(importMeta, p.Key, p.Value)" + ' returned an abrupt completion');

        if (_temp4 instanceof Completion) {
          _temp4 = _temp4.Value;
        }
      } // d. Perform ! HostFinalizeImportMeta(importMeta, module).


      let _temp5 = HostFinalizeImportMeta(importMeta, module);

      Assert(!(_temp5 instanceof AbruptCompletion), "HostFinalizeImportMeta(importMeta, module)" + ' returned an abrupt completion');

      if (_temp5 instanceof Completion) {
        _temp5 = _temp5.Value;
      }

      module.ImportMeta = importMeta; // f. Return importMeta.

      return importMeta;
    } else {
      // 5. Else,
      // a. Assert: Type(importMeta) is Object.
      Assert(Type(importMeta) === 'Object', "Type(importMeta) === 'Object'"); // b. Return importMeta.

      return importMeta;
    }
  }

  // DebuggerStatement : `debugger` `;`

  function Evaluate_DebuggerStatement() {
    let result; // 1. If an implementation-defined debugging facility is available and enabled, then

    if (exports.surroundingAgent.hostDefinedOptions.onDebugger) {
      // a. Perform an implementation-defined debugging action.
      // b. Let result be an implementation-defined Completion value.
      result = EnsureCompletion(exports.surroundingAgent.hostDefinedOptions.onDebugger());
    } else {
      // a. Let result be NormalCompletion(empty).
      result = NormalCompletion(undefined);
    } // 2. Return result.


    return result;
  }

  // BindingPropertyList : BIndingPropertyList `,` BindingProperty
  // BindingProperty :
  //   SingleNameBinding
  //   PropertyName `:` BindingElement

  function* PropertyBindingInitialization(node, value, environment) {
    if (Array.isArray(node)) {
      // 1. Let boundNames be ? PropertyBindingInitialization of BindingPropertyList with arguments value and environment.
      // 2. Let nextNames be ? PropertyBindingInitialization of BindingProperty with arguments value and environment.
      // 3. Append each item in nextNames to the end of boundNames.
      // 4. Return boundNames.
      const boundNames = [];

      for (const item of node) {
        let _temp = yield* PropertyBindingInitialization(item, value, environment);
        /* istanbul ignore if */


        if (_temp instanceof AbruptCompletion) {
          return _temp;
        }
        /* istanbul ignore if */


        if (_temp instanceof Completion) {
          _temp = _temp.Value;
        }

        const nextNames = _temp;
        boundNames.push(...nextNames);
      }

      return boundNames;
    }

    if (node.PropertyName) {
      // 1. Let P be the result of evaluating PropertyName.
      let P = yield* Evaluate_PropertyName(node.PropertyName); // 2. ReturnIfAbrupt(P).

      /* istanbul ignore if */
      if (P instanceof AbruptCompletion) {
        return P;
      }
      /* istanbul ignore if */


      if (P instanceof Completion) {
        P = P.Value;
      }

      let _temp2 = yield* KeyedBindingInitialization(node.BindingElement, value, environment, P);

      if (_temp2 instanceof AbruptCompletion) {
        return _temp2;
      }

      if (_temp2 instanceof Completion) {
        _temp2 = _temp2.Value;
      }

      return [P];
    } else {
      // 1. Let name be the string that is the only element of BoundNames of SingleNameBinding.
      const name = BoundNames(node)[0]; // 2. Perform ? KeyedBindingInitialization for SingleNameBinding using value, environment, and name as the arguments.

      let _temp3 = yield* KeyedBindingInitialization(node, value, environment, name);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      return [name];
    }
  }

  function* KeyedBindingInitialization(node, value, environment, propertyName) {
    if (node.type === 'BindingElement') {
      let _temp = GetV(value, propertyName);
      /* istanbul ignore if */


      if (_temp instanceof AbruptCompletion) {
        return _temp;
      }
      /* istanbul ignore if */


      if (_temp instanceof Completion) {
        _temp = _temp.Value;
      }

      // 1. Let v be ? GetV(value, propertyName).
      let v = _temp; // 2. If Initializer is present and v is undefined, then

      if (node.Initializer && v === Value.undefined) {
        // a. Let defaultValue be the result of evaluating Initializer.
        const defaultValue = yield* Evaluate(node.Initializer); // b. Set v to ? GetValue(defaultValue).

        let _temp2 = GetValue(defaultValue);

        if (_temp2 instanceof AbruptCompletion) {
          return _temp2;
        }

        if (_temp2 instanceof Completion) {
          _temp2 = _temp2.Value;
        }

        v = _temp2;
      } // 2. Return the result of performing BindingInitialization for BindingPattern passing v and environment as arguments.


      return yield* BindingInitialization(node.BindingPattern, v, environment);
    } else {
      // 1. Let bindingId be StringValue of BindingIdentifier.
      const bindingId = StringValue(node.BindingIdentifier); // 2. Let lhs be ? ResolveBinding(bindingId, environment).

      let _temp3 = ResolveBinding(bindingId, environment, node.BindingIdentifier.strict);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }

      const lhs = _temp3; // 3. Let v be ? GetV(value, propertyName).

      let _temp4 = GetV(value, propertyName);

      if (_temp4 instanceof AbruptCompletion) {
        return _temp4;
      }

      if (_temp4 instanceof Completion) {
        _temp4 = _temp4.Value;
      }

      let v = _temp4;

      if (node.Initializer && v === Value.undefined) {
        // a. If IsAnonymousFunctionDefinition(Initializer) is true, then
        if (IsAnonymousFunctionDefinition(node.Initializer)) {
          // i. Set v to the result of performing NamedEvaluation for Initializer with argument bindingId.
          v = yield* NamedEvaluation(node.Initializer, bindingId);
        } else {
          // b. Else,
          // i. Let defaultValue be the result of evaluating Initializer.
          const defaultValue = yield* Evaluate(node.Initializer); // ii. Set v to ? GetValue(defaultValue).

          let _temp5 = GetValue(defaultValue);

          if (_temp5 instanceof AbruptCompletion) {
            return _temp5;
          }

          if (_temp5 instanceof Completion) {
            _temp5 = _temp5.Value;
          }

          v = _temp5;
        }
      } // 5. If environment is undefined, return ? PutValue(lhs, v).


      if (environment === Value.undefined) {
        return PutValue(lhs, v);
      } // 6. Return InitializeReferencedBinding(lhs, v).


      return InitializeReferencedBinding(lhs, v);
    }
  }

  //  `{` `}`
  //  `{` AssignmentPropertyList `}`
  //  `{` AssignmentPropertyList `,` `}`
  //  `{` AssignmentPropertyList `,` AssignmentRestProperty? `}`

  function* DestructuringAssignmentEvaluation_ObjectAssignmentPattern({
    AssignmentPropertyList,
    AssignmentRestProperty
  }, value) {
    let _temp = RequireObjectCoercible(value);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    let _temp2 = yield* PropertyDestructuringAssignmentEvaluation(AssignmentPropertyList, value);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    const excludedNames = _temp2;

    if (AssignmentRestProperty) {
      let _temp3 = yield* RestDestructuringAssignmentEvaluation(AssignmentRestProperty, value, excludedNames);

      if (_temp3 instanceof AbruptCompletion) {
        return _temp3;
      }

      if (_temp3 instanceof Completion) {
        _temp3 = _temp3.Value;
      }
    } // 3. Return NormalCompletion(empty).


    return NormalCompletion(undefined);
  } // #sec-runtime-semantics-restdestructuringassignmentevaluation
  // AssignmentRestProperty : `...` DestructuringAssignmentTarget


  function* RestDestructuringAssignmentEvaluation({
    DestructuringAssignmentTarget
  }, value, excludedNames) {
    // 1. Let lref be the result of evaluating DestructuringAssignmentTarget.
    let lref = yield* Evaluate(DestructuringAssignmentTarget); // 2. ReturnIfAbrupt(lref).

    /* istanbul ignore if */
    if (lref instanceof AbruptCompletion) {
      return lref;
    }
    /* istanbul ignore if */


    if (lref instanceof Completion) {
      lref = lref.Value;
    }

    const restObj = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%Object.prototype%')); // 4. Perform ? CopyDataProperties(restObj, value, excludedNames).

    let _temp4 = CopyDataProperties(restObj, value, excludedNames);

    if (_temp4 instanceof AbruptCompletion) {
      return _temp4;
    }

    if (_temp4 instanceof Completion) {
      _temp4 = _temp4.Value;
    }

    return PutValue(lref, restObj);
  }

  RestDestructuringAssignmentEvaluation.section = 'https://tc39.es/ecma262/#sec-runtime-semantics-restdestructuringassignmentevaluation';

  function* PropertyDestructuringAssignmentEvaluation(AssignmentPropertyList, value) {
    const propertyNames = [];

    for (const AssignmentProperty of AssignmentPropertyList) {
      if (AssignmentProperty.IdentifierReference) {
        // 1. Let P be StringValue of IdentifierReference.
        const P = StringValue(AssignmentProperty.IdentifierReference); // 2. Let lref be ? ResolveBinding(P).

        let _temp5 = ResolveBinding(P, undefined, AssignmentProperty.IdentifierReference.strict);

        if (_temp5 instanceof AbruptCompletion) {
          return _temp5;
        }

        if (_temp5 instanceof Completion) {
          _temp5 = _temp5.Value;
        }

        const lref = _temp5; // 3. Let v be ? GetV(value, P).

        let _temp6 = GetV(value, P);

        if (_temp6 instanceof AbruptCompletion) {
          return _temp6;
        }

        if (_temp6 instanceof Completion) {
          _temp6 = _temp6.Value;
        }

        let v = _temp6; // 4. If Initializer? is present and v is undefined, then

        if (AssignmentProperty.Initializer && v === Value.undefined) {
          // a. If IsAnonymousFunctionDefinition(Initializer) is true, then
          if (IsAnonymousFunctionDefinition(AssignmentProperty.Initializer)) {
            // i. Set v to the result of performing NamedEvaluation for Initializer with argument P.
            v = yield* NamedEvaluation(AssignmentProperty.Initializer, P);
          } else {
            // b. Else,
            // i. Let defaultValue be the result of evaluating Initializer.
            const defaultValue = yield* Evaluate(AssignmentProperty.Initializer); // ii. Set v to ? GetValue(defaultValue)

            let _temp7 = GetValue(defaultValue);

            if (_temp7 instanceof AbruptCompletion) {
              return _temp7;
            }

            if (_temp7 instanceof Completion) {
              _temp7 = _temp7.Value;
            }

            v = _temp7;
          }
        } // 5. Perform ? PutValue(lref, v).


        let _temp8 = PutValue(lref, v);

        if (_temp8 instanceof AbruptCompletion) {
          return _temp8;
        }

        if (_temp8 instanceof Completion) {
          _temp8 = _temp8.Value;
        }

        propertyNames.push(P);
      } else {
        // 1. Let name be the result of evaluating PropertyName.
        let name = yield* Evaluate_PropertyName(AssignmentProperty.PropertyName); // 2. ReturnIfAbrupt(name).

        if (name instanceof AbruptCompletion) {
          return name;
        }

        if (name instanceof Completion) {
          name = name.Value;
        }

        let _temp9 = yield* KeyedDestructuringAssignmentEvaluation(AssignmentProperty.AssignmentElement, value, name);

        if (_temp9 instanceof AbruptCompletion) {
          return _temp9;
        }

        if (_temp9 instanceof Completion) {
          _temp9 = _temp9.Value;
        }

        propertyNames.push(name);
      }
    }

    return propertyNames;
  } // AssignmentElement : DestructuringAssignmentTarget Initializer?


  function* KeyedDestructuringAssignmentEvaluation({
    DestructuringAssignmentTarget,
    Initializer
  }, value, propertyName) {
    // 1. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then
    let lref;

    if (DestructuringAssignmentTarget.type !== 'ObjectLiteral' && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
      // a. Let lref be the result of evaluating DestructuringAssignmentTarget.
      lref = yield* Evaluate(DestructuringAssignmentTarget); // b. ReturnIfAbrupt(lref).

      if (lref instanceof AbruptCompletion) {
        return lref;
      }

      if (lref instanceof Completion) {
        lref = lref.Value;
      }
    } // 2. Let v be ? GetV(value, propertyName).


    let _temp10 = GetV(value, propertyName);

    if (_temp10 instanceof AbruptCompletion) {
      return _temp10;
    }

    if (_temp10 instanceof Completion) {
      _temp10 = _temp10.Value;
    }

    const v = _temp10; // 3. If Initializer is present and v is undefined, then

    let rhsValue;

    if (Initializer && v === Value.undefined) {
      // a. If IsAnonymousFunctionDefinition(Initializer) and IsIdentifierRef of DestructuringAssignmentTarget are both true, then
      if (IsAnonymousFunctionDefinition(Initializer) && IsIdentifierRef(DestructuringAssignmentTarget)) {
        // i. Let rhsValue be NamedEvaluation of Initializer with argument GetReferencedName(lref).
        rhsValue = yield* NamedEvaluation(Initializer, GetReferencedName(lref));
      } else {
        // i. Let defaultValue be the result of evaluating Initializer.
        const defaultValue = yield* Evaluate(Initializer); // ii. Let rhsValue be ? GetValue(defaultValue).

        let _temp11 = GetValue(defaultValue);

        if (_temp11 instanceof AbruptCompletion) {
          return _temp11;
        }

        if (_temp11 instanceof Completion) {
          _temp11 = _temp11.Value;
        }

        rhsValue = _temp11;
      }
    } else {
      // 4. Else, let rhsValue be v.
      rhsValue = v;
    } // 5. If DestructuringAssignmentTarget is an ObjectLiteral or an ArrayLiteral, then


    if (DestructuringAssignmentTarget.type === 'ObjectLiteral' || DestructuringAssignmentTarget.type === 'ArrayLiteral') {
      // a. Let assignmentPattern be the AssignmentPattern that is covered by DestructuringAssignmentTarget.
      const assignmentPattern = refineLeftHandSideExpression(DestructuringAssignmentTarget); // b. Return the result of performing DestructuringAssignmentEvaluation of assignmentPattern with rhsValue as the argument.

      return yield* DestructuringAssignmentEvaluation(assignmentPattern, rhsValue);
    } // 6. Return ? PutValue(lref, rhsValue).


    return PutValue(lref, rhsValue);
  } // ArrayAssignmentPattern :
  //   `[` `]`
  //   `[` AssignmentElementList `]`
  //   `[` AssignmentElementList `,` AssignmentRestElement? `]`


  function* DestructuringAssignmentEvaluation_ArrayAssignmentPattern({
    AssignmentElementList,
    AssignmentRestElement
  }, value) {
    let _temp12 = GetIterator(value);

    if (_temp12 instanceof AbruptCompletion) {
      return _temp12;
    }

    if (_temp12 instanceof Completion) {
      _temp12 = _temp12.Value;
    }

    // 1. Let iteratorRecord be ? GetIterator(value).
    const iteratorRecord = _temp12; // 2. Let status be IteratorDestructuringAssignmentEvaluation of AssignmentElementList with argument iteratorRecord.

    let status = EnsureCompletion(yield* IteratorDestructuringAssignmentEvaluation$1(AssignmentElementList, iteratorRecord)); // 3. If status is an abrupt completion, then

    if (status instanceof AbruptCompletion) {
      // a. If iteratorRecord.[[Done]] is false, return ? IteratorClose(iteratorRecord, status).
      if (iteratorRecord.Done === Value.false) {
        return IteratorClose(iteratorRecord, status);
      } // b. Return Completion(status).


      return Completion(status);
    } // 4. If Elision is present, then
    // ...
    // 5. If AssignmentRestElement is present, then


    if (AssignmentRestElement) {
      // a. Set status to the result of performing IteratorDestructuringAssignmentEvaluation of AssignmentRestElement with iteratorRecord as the argument.
      status = EnsureCompletion(yield* IteratorDestructuringAssignmentEvaluation$1(AssignmentRestElement, iteratorRecord));
    } // 6. If iteratorRecord.[[Done]] is false, return ? IteratorClose(iteratorRecord, status).


    if (iteratorRecord.Done === Value.false) {
      return IteratorClose(iteratorRecord, status);
    }

    return Completion(status);
  }

  function* IteratorDestructuringAssignmentEvaluation$1(node, iteratorRecord) {
    if (Array.isArray(node)) {
      for (const n of node) {
        let _temp13 = yield* IteratorDestructuringAssignmentEvaluation$1(n, iteratorRecord);

        if (_temp13 instanceof AbruptCompletion) {
          return _temp13;
        }

        if (_temp13 instanceof Completion) {
          _temp13 = _temp13.Value;
        }
      }

      return NormalCompletion(undefined);
    }

    switch (node.type) {
      case 'Elision':
        // 1. If iteratorRecord.[[Done]] is false, then
        if (iteratorRecord.Done === Value.false) {
          // a. Let next be IteratorStep(iteratorRecord).
          let next = IteratorStep(iteratorRecord); // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

          if (next instanceof AbruptCompletion) {
            iteratorRecord.Done = Value.true;
          } // c. ReturnIfAbrupt(next)


          if (next instanceof AbruptCompletion) {
            return next;
          }

          if (next instanceof Completion) {
            next = next.Value;
          }

          if (next === Value.false) {
            iteratorRecord.Done = Value.true;
          }
        } // 2. Return NormalCompletion(empty).


        return NormalCompletion(undefined);

      case 'AssignmentElement':
        {
          const {
            DestructuringAssignmentTarget,
            Initializer
          } = node;
          let lref; // 1. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then

          if (DestructuringAssignmentTarget.type !== 'ObjectLiteral' && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
            lref = yield* Evaluate(DestructuringAssignmentTarget);

            if (lref instanceof AbruptCompletion) {
              return lref;
            }

            if (lref instanceof Completion) {
              lref = lref.Value;
            }
          }

          let value; // 2. If iteratorRecord.[[Done]] is false, then

          if (iteratorRecord.Done === Value.false) {
            // a. Let next be IteratorStep(iteratorRecord).
            let next = IteratorStep(iteratorRecord); // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

            if (next instanceof AbruptCompletion) {
              iteratorRecord.Done = Value.true;
            } // c. ReturnIfAbrupt(next);


            if (next instanceof AbruptCompletion) {
              return next;
            }

            if (next instanceof Completion) {
              next = next.Value;
            }

            if (next === Value.false) {
              iteratorRecord.Done = Value.true;
            } else {
              // e. Else,
              // i. Let value be IteratorValue(next).
              value = IteratorValue(next); // ii. If value is an abrupt completion, set iteratorRecord.[[Done]] to true.

              if (value instanceof AbruptCompletion) {
                iteratorRecord.Done = Value.true;
              } // iii. ReturnIfAbrupt(value).


              if (value instanceof AbruptCompletion) {
                return value;
              }

              if (value instanceof Completion) {
                value = value.Value;
              }
            }
          } // 3. If iteratorRecord.[[Done]] is true, let value be undefined.


          if (iteratorRecord.Done === Value.true) {
            value = Value.undefined;
          }

          let v; // 4. If Initializer is present and value is undefined, then

          if (Initializer && value === Value.undefined) {
            // a. If IsAnonymousFunctionDefinition(AssignmentExpression) is true and IsIdentifierRef of LeftHandSideExpression is true, then
            if (IsAnonymousFunctionDefinition(Initializer) && IsIdentifierRef(DestructuringAssignmentTarget)) {
              // i. Let v be NamedEvaluation of Initializer with argument GetReferencedName(lref).
              v = yield* NamedEvaluation(Initializer, GetReferencedName(lref));
            } else {
              // b. Else,
              // i. Let defaultValue be the result of evaluating Initializer.
              const defaultValue = yield* Evaluate(Initializer); // ii. Let v be ? GetValue(defaultValue).

              let _temp14 = GetValue(defaultValue);

              if (_temp14 instanceof AbruptCompletion) {
                return _temp14;
              }

              if (_temp14 instanceof Completion) {
                _temp14 = _temp14.Value;
              }

              v = _temp14;
            }
          } else {
            // 5. Else, let v be value.
            v = value;
          } // 6. If DestructuringAssignmentTarget is an ObjectLiteral or an ArrayLiteral, then


          if (DestructuringAssignmentTarget.type === 'ObjectLiteral' || DestructuringAssignmentTarget.type === 'ArrayLiteral') {
            // a. Let nestedAssignmentPattern be the AssignmentPattern that is covered by DestructuringAssignmentTarget.
            const nestedAssignmentPattern = refineLeftHandSideExpression(DestructuringAssignmentTarget); // b. Return the result of performing DestructuringAssignmentEvaluation of nestedAssignmentPattern with v as the argument.

            return yield* DestructuringAssignmentEvaluation(nestedAssignmentPattern, v);
          } // 7. Return ? PutValue(lref, v).


          return PutValue(lref, v);
        }

      case 'AssignmentRestElement':
        {
          const {
            DestructuringAssignmentTarget
          } = node;
          let lref; // 1. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then

          if (DestructuringAssignmentTarget.type !== 'ObjectLiteral' && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
            lref = yield* Evaluate(DestructuringAssignmentTarget);

            if (lref instanceof AbruptCompletion) {
              return lref;
            }

            if (lref instanceof Completion) {
              lref = lref.Value;
            }
          } // 2. Let A be ! ArrayCreate(0).


          let _temp15 = ArrayCreate(new Value(0));

          Assert(!(_temp15 instanceof AbruptCompletion), "ArrayCreate(new Value(0))" + ' returned an abrupt completion');
          /* istanbul ignore if */

          if (_temp15 instanceof Completion) {
            _temp15 = _temp15.Value;
          }

          const A = _temp15; // 3. Let n be 0.

          let n = 0; // 4. Repeat, while iteratorRecord.[[Done]] is false,

          while (iteratorRecord.Done === Value.false) {
            // a. Let next be IteratorStep(iteratorRecord).
            let next = IteratorStep(iteratorRecord); // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.

            if (next instanceof AbruptCompletion) {
              iteratorRecord.Done = Value.true;
            } // c. ReturnIfAbrupt(next);


            if (next instanceof AbruptCompletion) {
              return next;
            }

            if (next instanceof Completion) {
              next = next.Value;
            }

            if (next === Value.false) {
              iteratorRecord.Done = Value.true;
            } else {
              // e. Else,
              // i. Let nextValue be IteratorValue(next).
              let nextValue = IteratorValue(next); // ii. If nextValue is an abrupt completion, set iteratorRecord.[[Done]] to true.

              if (nextValue instanceof AbruptCompletion) {
                iteratorRecord.Done = Value.true;
              } // iii. ReturnIfAbrupt(nextValue).


              if (nextValue instanceof AbruptCompletion) {
                return nextValue;
              }

              if (nextValue instanceof Completion) {
                nextValue = nextValue.Value;
              }

              let _temp17 = ToString(new Value(n));

              Assert(!(_temp17 instanceof AbruptCompletion), "ToString(new Value(n))" + ' returned an abrupt completion');

              if (_temp17 instanceof Completion) {
                _temp17 = _temp17.Value;
              }

              let _temp16 = CreateDataPropertyOrThrow(A, _temp17, nextValue);

              Assert(!(_temp16 instanceof AbruptCompletion), "CreateDataPropertyOrThrow(A, X(ToString(new Value(n))), nextValue)" + ' returned an abrupt completion');

              if (_temp16 instanceof Completion) {
                _temp16 = _temp16.Value;
              }

              n += 1;
            }
          } // 5. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then


          if (DestructuringAssignmentTarget.type !== 'ObjectLiteral' && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
            return PutValue(lref, A);
          } // 6. Let nestedAssignmentPattern be the AssignmentPattern that is covered by DestructuringAssignmentTarget.


          const nestedAssignmentPattern = refineLeftHandSideExpression(DestructuringAssignmentTarget); // 7. Return the result of performing DestructuringAssignmentEvaluation of nestedAssignmentPattern with A as the argument.

          return yield* DestructuringAssignmentEvaluation(nestedAssignmentPattern, A);
        }

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('IteratorDestructuringAssignmentEvaluation', node);
    }
  }

  function DestructuringAssignmentEvaluation(node, value) {
    switch (node.type) {
      case 'ObjectAssignmentPattern':
        return DestructuringAssignmentEvaluation_ObjectAssignmentPattern(node, value);

      case 'ArrayAssignmentPattern':
        return DestructuringAssignmentEvaluation_ArrayAssignmentPattern(node, value);

      /*istanbul ignore next*/
      default:
        throw new OutOfRange('DestructuringAssignmentEvaluation', node);
    }
  }

  function RestBindingInitialization({
    BindingIdentifier
  }, value, environment, excludedNames) {
    let _temp = ResolveBinding(StringValue(BindingIdentifier), environment, BindingIdentifier.strict);
    /* istanbul ignore if */


    if (_temp instanceof AbruptCompletion) {
      return _temp;
    }
    /* istanbul ignore if */


    if (_temp instanceof Completion) {
      _temp = _temp.Value;
    }

    // 1. Let lhs be ? ResolveBinding(StringValue of BindingIdentifier, environment).
    const lhs = _temp; // 2. Let restObj be OrdinaryObjectCreate(%Object.prototype%).

    const restObj = OrdinaryObjectCreate(exports.surroundingAgent.intrinsic('%Object.prototype%')); // 3. Perform ? CopyDataProperties(restObj, value, excludedNames).

    let _temp2 = CopyDataProperties(restObj, value, excludedNames);

    if (_temp2 instanceof AbruptCompletion) {
      return _temp2;
    }

    if (_temp2 instanceof Completion) {
      _temp2 = _temp2.Value;
    }

    if (environment === Value.undefined) {
      return PutValue(lhs, restObj);
    } // 5. Return InitializeReferencedBinding(lhs, restObj).


    return InitializeReferencedBinding(lhs, restObj);
  }

  var UnicodeSets = {
  	"Word_Break/MidNum": [
  	[
  		44,
  		44
  	],
  	[
  		59,
  		59
  	],
  	[
  		894,
  		894
  	],
  	[
  		1417,
  		1417
  	],
  	[
  		1548,
  		1549
  	],
  	[
  		1644,
  		1644
  	],
  	[
  		2040,
  		2040
  	],
  	[
  		8260,
  		8260
  	],
  	[
  		65040,
  		65040
  	],
  	[
  		65044,
  		65044
  	],
  	[
  		65104,
  		65104
  	],
  	[
  		65108,
  		65108
  	],
  	[
  		65292,
  		65292
  	],
  	[
  		65307,
  		65307
  	]
  ],
  	"Word_Break/Numeric": [
  	[
  		48,
  		57
  	],
  	[
  		1632,
  		1641
  	],
  	[
  		1643,
  		1643
  	],
  	[
  		1776,
  		1785
  	],
  	[
  		1984,
  		1993
  	],
  	[
  		2406,
  		2415
  	],
  	[
  		2534,
  		2543
  	],
  	[
  		2662,
  		2671
  	],
  	[
  		2790,
  		2799
  	],
  	[
  		2918,
  		2927
  	],
  	[
  		3046,
  		3055
  	],
  	[
  		3174,
  		3183
  	],
  	[
  		3302,
  		3311
  	],
  	[
  		3430,
  		3439
  	],
  	[
  		3558,
  		3567
  	],
  	[
  		3664,
  		3673
  	],
  	[
  		3792,
  		3801
  	],
  	[
  		3872,
  		3881
  	],
  	[
  		4160,
  		4169
  	],
  	[
  		4240,
  		4249
  	],
  	[
  		6112,
  		6121
  	],
  	[
  		6160,
  		6169
  	],
  	[
  		6470,
  		6479
  	],
  	[
  		6608,
  		6617
  	],
  	[
  		6784,
  		6793
  	],
  	[
  		6800,
  		6809
  	],
  	[
  		6992,
  		7001
  	],
  	[
  		7088,
  		7097
  	],
  	[
  		7232,
  		7241
  	],
  	[
  		7248,
  		7257
  	],
  	[
  		42528,
  		42537
  	],
  	[
  		43216,
  		43225
  	],
  	[
  		43264,
  		43273
  	],
  	[
  		43472,
  		43481
  	],
  	[
  		43504,
  		43513
  	],
  	[
  		43600,
  		43609
  	],
  	[
  		44016,
  		44025
  	],
  	[
  		65296,
  		65305
  	],
  	[
  		66720,
  		66729
  	],
  	[
  		68912,
  		68921
  	],
  	[
  		69734,
  		69743
  	],
  	[
  		69872,
  		69881
  	],
  	[
  		69942,
  		69951
  	],
  	[
  		70096,
  		70105
  	],
  	[
  		70384,
  		70393
  	],
  	[
  		70736,
  		70745
  	],
  	[
  		70864,
  		70873
  	],
  	[
  		71248,
  		71257
  	],
  	[
  		71360,
  		71369
  	],
  	[
  		71472,
  		71481
  	],
  	[
  		71904,
  		71913
  	],
  	[
  		72016,
  		72025
  	],
  	[
  		72784,
  		72793
  	],
  	[
  		73040,
  		73049
  	],
  	[
  		73120,
  		73129
  	],
  	[
  		92768,
  		92777
  	],
  	[
  		93008,
  		93017
  	],
  	[
  		120782,
  		120831
  	],
  	[
  		123200,
  		123209
  	],
  	[
  		123632,
  		123641
  	],
  	[
  		125264,
  		125273
  	],
  	[
  		130032,
  		130041
  	]
  ],
  	"Word_Break/Regional_Indicator": [
  	[
  		127462,
  		127487
  	]
  ],
  	"Word_Break/Hebrew_Letter": [
  	[
  		1488,
  		1514
  	],
  	[
  		1519,
  		1522
  	],
  	[
  		64285,
  		64285
  	],
  	[
  		64287,
  		64296
  	],
  	[
  		64298,
  		64310
  	],
  	[
  		64312,
  		64316
  	],
  	[
  		64318,
  		64318
  	],
  	[
  		64320,
  		64321
  	],
  	[
  		64323,
  		64324
  	],
  	[
  		64326,
  		64335
  	]
  ],
  	"Word_Break/ZWJ": [
  	[
  		8205,
  		8205
  	]
  ],
  	"Word_Break/Double_Quote": [
  	[
  		34,
  		34
  	]
  ],
  	"Word_Break/Format": [
  	[
  		173,
  		173
  	],
  	[
  		1536,
  		1541
  	],
  	[
  		1564,
  		1564
  	],
  	[
  		1757,
  		1757
  	],
  	[
  		1807,
  		1807
  	],
  	[
  		2274,
  		2274
  	],
  	[
  		6158,
  		6158
  	],
  	[
  		8206,
  		8207
  	],
  	[
  		8234,
  		8238
  	],
  	[
  		8288,
  		8292
  	],
  	[
  		8294,
  		8303
  	],
  	[
  		65279,
  		65279
  	],
  	[
  		65529,
  		65531
  	],
  	[
  		69821,
  		69821
  	],
  	[
  		69837,
  		69837
  	],
  	[
  		78896,
  		78904
  	],
  	[
  		113824,
  		113827
  	],
  	[
  		119155,
  		119162
  	],
  	[
  		917505,
  		917505
  	]
  ],
  	"Word_Break/CR": [
  	[
  		13,
  		13
  	]
  ],
  	"Word_Break/Other": [
  	[
  		0,
  		9
  	],
  	[
  		14,
  		31
  	],
  	[
  		33,
  		33
  	],
  	[
  		35,
  		38
  	],
  	[
  		40,
  		43
  	],
  	[
  		45,
  		45
  	],
  	[
  		47,
  		47
  	],
  	[
  		60,
  		64
  	],
  	[
  		91,
  		94
  	],
  	[
  		96,
  		96
  	],
  	[
  		123,
  		132
  	],
  	[
  		134,
  		169
  	],
  	[
  		171,
  		172
  	],
  	[
  		174,
  		180
  	],
  	[
  		182,
  		182
  	],
  	[
  		184,
  		185
  	],
  	[
  		187,
  		191
  	],
  	[
  		215,
  		215
  	],
  	[
  		247,
  		247
  	],
  	[
  		728,
  		733
  	],
  	[
  		885,
  		885
  	],
  	[
  		888,
  		889
  	],
  	[
  		896,
  		901
  	],
  	[
  		907,
  		907
  	],
  	[
  		909,
  		909
  	],
  	[
  		930,
  		930
  	],
  	[
  		1014,
  		1014
  	],
  	[
  		1154,
  		1154
  	],
  	[
  		1328,
  		1328
  	],
  	[
  		1367,
  		1368
  	],
  	[
  		1373,
  		1373
  	],
  	[
  		1419,
  		1424
  	],
  	[
  		1470,
  		1470
  	],
  	[
  		1472,
  		1472
  	],
  	[
  		1475,
  		1475
  	],
  	[
  		1478,
  		1478
  	],
  	[
  		1480,
  		1487
  	],
  	[
  		1515,
  		1518
  	],
  	[
  		1525,
  		1535
  	],
  	[
  		1542,
  		1547
  	],
  	[
  		1550,
  		1551
  	],
  	[
  		1563,
  		1563
  	],
  	[
  		1565,
  		1567
  	],
  	[
  		1642,
  		1642
  	],
  	[
  		1645,
  		1645
  	],
  	[
  		1748,
  		1748
  	],
  	[
  		1758,
  		1758
  	],
  	[
  		1769,
  		1769
  	],
  	[
  		1789,
  		1790
  	],
  	[
  		1792,
  		1806
  	],
  	[
  		1867,
  		1868
  	],
  	[
  		1970,
  		1983
  	],
  	[
  		2038,
  		2039
  	],
  	[
  		2041,
  		2041
  	],
  	[
  		2043,
  		2044
  	],
  	[
  		2046,
  		2047
  	],
  	[
  		2094,
  		2111
  	],
  	[
  		2140,
  		2143
  	],
  	[
  		2155,
  		2207
  	],
  	[
  		2229,
  		2229
  	],
  	[
  		2248,
  		2258
  	],
  	[
  		2404,
  		2405
  	],
  	[
  		2416,
  		2416
  	],
  	[
  		2436,
  		2436
  	],
  	[
  		2445,
  		2446
  	],
  	[
  		2449,
  		2450
  	],
  	[
  		2473,
  		2473
  	],
  	[
  		2481,
  		2481
  	],
  	[
  		2483,
  		2485
  	],
  	[
  		2490,
  		2491
  	],
  	[
  		2501,
  		2502
  	],
  	[
  		2505,
  		2506
  	],
  	[
  		2511,
  		2518
  	],
  	[
  		2520,
  		2523
  	],
  	[
  		2526,
  		2526
  	],
  	[
  		2532,
  		2533
  	],
  	[
  		2546,
  		2555
  	],
  	[
  		2557,
  		2557
  	],
  	[
  		2559,
  		2560
  	],
  	[
  		2564,
  		2564
  	],
  	[
  		2571,
  		2574
  	],
  	[
  		2577,
  		2578
  	],
  	[
  		2601,
  		2601
  	],
  	[
  		2609,
  		2609
  	],
  	[
  		2612,
  		2612
  	],
  	[
  		2615,
  		2615
  	],
  	[
  		2618,
  		2619
  	],
  	[
  		2621,
  		2621
  	],
  	[
  		2627,
  		2630
  	],
  	[
  		2633,
  		2634
  	],
  	[
  		2638,
  		2640
  	],
  	[
  		2642,
  		2648
  	],
  	[
  		2653,
  		2653
  	],
  	[
  		2655,
  		2661
  	],
  	[
  		2678,
  		2688
  	],
  	[
  		2692,
  		2692
  	],
  	[
  		2702,
  		2702
  	],
  	[
  		2706,
  		2706
  	],
  	[
  		2729,
  		2729
  	],
  	[
  		2737,
  		2737
  	],
  	[
  		2740,
  		2740
  	],
  	[
  		2746,
  		2747
  	],
  	[
  		2758,
  		2758
  	],
  	[
  		2762,
  		2762
  	],
  	[
  		2766,
  		2767
  	],
  	[
  		2769,
  		2783
  	],
  	[
  		2788,
  		2789
  	],
  	[
  		2800,
  		2808
  	],
  	[
  		2816,
  		2816
  	],
  	[
  		2820,
  		2820
  	],
  	[
  		2829,
  		2830
  	],
  	[
  		2833,
  		2834
  	],
  	[
  		2857,
  		2857
  	],
  	[
  		2865,
  		2865
  	],
  	[
  		2868,
  		2868
  	],
  	[
  		2874,
  		2875
  	],
  	[
  		2885,
  		2886
  	],
  	[
  		2889,
  		2890
  	],
  	[
  		2894,
  		2900
  	],
  	[
  		2904,
  		2907
  	],
  	[
  		2910,
  		2910
  	],
  	[
  		2916,
  		2917
  	],
  	[
  		2928,
  		2928
  	],
  	[
  		2930,
  		2945
  	],
  	[
  		2948,
  		2948
  	],
  	[
  		2955,
  		2957
  	],
  	[
  		2961,
  		2961
  	],
  	[
  		2966,
  		2968
  	],
  	[
  		2971,
  		2971
  	],
  	[
  		2973,
  		2973
  	],
  	[
  		2976,
  		2978
  	],
  	[
  		2981,
  		2983
  	],
  	[
  		2987,
  		2989
  	],
  	[
  		3002,
  		3005
  	],
  	[
  		3011,
  		3013
  	],
  	[
  		3017,
  		3017
  	],
  	[
  		3022,
  		3023
  	],
  	[
  		3025,
  		3030
  	],
  	[
  		3032,
  		3045
  	],
  	[
  		3056,
  		3071
  	],
  	[
  		3085,
  		3085
  	],
  	[
  		3089,
  		3089
  	],
  	[
  		3113,
  		3113
  	],
  	[
  		3130,
  		3132
  	],
  	[
  		3141,
  		3141
  	],
  	[
  		3145,
  		3145
  	],
  	[
  		3150,
  		3156
  	],
  	[
  		3159,
  		3159
  	],
  	[
  		3163,
  		3167
  	],
  	[
  		3172,
  		3173
  	],
  	[
  		3184,
  		3199
  	],
  	[
  		3204,
  		3204
  	],
  	[
  		3213,
  		3213
  	],
  	[
  		3217,
  		3217
  	],
  	[
  		3241,
  		3241
  	],
  	[
  		3252,
  		3252
  	],
  	[
  		3258,
  		3259
  	],
  	[
  		3269,
  		3269
  	],
  	[
  		3273,
  		3273
  	],
  	[
  		3278,
  		3284
  	],
  	[
  		3287,
  		3293
  	],
  	[
  		3295,
  		3295
  	],
  	[
  		3300,
  		3301
  	],
  	[
  		3312,
  		3312
  	],
  	[
  		3315,
  		3327
  	],
  	[
  		3341,
  		3341
  	],
  	[
  		3345,
  		3345
  	],
  	[
  		3397,
  		3397
  	],
  	[
  		3401,
  		3401
  	],
  	[
  		3407,
  		3411
  	],
  	[
  		3416,
  		3422
  	],
  	[
  		3428,
  		3429
  	],
  	[
  		3440,
  		3449
  	],
  	[
  		3456,
  		3456
  	],
  	[
  		3460,
  		3460
  	],
  	[
  		3479,
  		3481
  	],
  	[
  		3506,
  		3506
  	],
  	[
  		3516,
  		3516
  	],
  	[
  		3518,
  		3519
  	],
  	[
  		3527,
  		3529
  	],
  	[
  		3531,
  		3534
  	],
  	[
  		3541,
  		3541
  	],
  	[
  		3543,
  		3543
  	],
  	[
  		3552,
  		3557
  	],
  	[
  		3568,
  		3569
  	],
  	[
  		3572,
  		3632
  	],
  	[
  		3634,
  		3635
  	],
  	[
  		3643,
  		3654
  	],
  	[
  		3663,
  		3663
  	],
  	[
  		3674,
  		3760
  	],
  	[
  		3762,
  		3763
  	],
  	[
  		3773,
  		3783
  	],
  	[
  		3790,
  		3791
  	],
  	[
  		3802,
  		3839
  	],
  	[
  		3841,
  		3863
  	],
  	[
  		3866,
  		3871
  	],
  	[
  		3882,
  		3892
  	],
  	[
  		3894,
  		3894
  	],
  	[
  		3896,
  		3896
  	],
  	[
  		3898,
  		3901
  	],
  	[
  		3912,
  		3912
  	],
  	[
  		3949,
  		3952
  	],
  	[
  		3973,
  		3973
  	],
  	[
  		3992,
  		3992
  	],
  	[
  		4029,
  		4037
  	],
  	[
  		4039,
  		4138
  	],
  	[
  		4159,
  		4159
  	],
  	[
  		4170,
  		4181
  	],
  	[
  		4186,
  		4189
  	],
  	[
  		4193,
  		4193
  	],
  	[
  		4197,
  		4198
  	],
  	[
  		4206,
  		4208
  	],
  	[
  		4213,
  		4225
  	],
  	[
  		4238,
  		4238
  	],
  	[
  		4254,
  		4255
  	],
  	[
  		4294,
  		4294
  	],
  	[
  		4296,
  		4300
  	],
  	[
  		4302,
  		4303
  	],
  	[
  		4347,
  		4347
  	],
  	[
  		4681,
  		4681
  	],
  	[
  		4686,
  		4687
  	],
  	[
  		4695,
  		4695
  	],
  	[
  		4697,
  		4697
  	],
  	[
  		4702,
  		4703
  	],
  	[
  		4745,
  		4745
  	],
  	[
  		4750,
  		4751
  	],
  	[
  		4785,
  		4785
  	],
  	[
  		4790,
  		4791
  	],
  	[
  		4799,
  		4799
  	],
  	[
  		4801,
  		4801
  	],
  	[
  		4806,
  		4807
  	],
  	[
  		4823,
  		4823
  	],
  	[
  		4881,
  		4881
  	],
  	[
  		4886,
  		4887
  	],
  	[
  		4955,
  		4956
  	],
  	[
  		4960,
  		4991
  	],
  	[
  		5008,
  		5023
  	],
  	[
  		5110,
  		5111
  	],
  	[
  		5118,
  		5120
  	],
  	[
  		5741,
  		5742
  	],
  	[
  		5787,
  		5791
  	],
  	[
  		5867,
  		5869
  	],
  	[
  		5881,
  		5887
  	],
  	[
  		5901,
  		5901
  	],
  	[
  		5909,
  		5919
  	],
  	[
  		5941,
  		5951
  	],
  	[
  		5972,
  		5983
  	],
  	[
  		5997,
  		5997
  	],
  	[
  		6001,
  		6001
  	],
  	[
  		6004,
  		6067
  	],
  	[
  		6100,
  		6108
  	],
  	[
  		6110,
  		6111
  	],
  	[
  		6122,
  		6154
  	],
  	[
  		6159,
  		6159
  	],
  	[
  		6170,
  		6175
  	],
  	[
  		6265,
  		6271
  	],
  	[
  		6315,
  		6319
  	],
  	[
  		6390,
  		6399
  	],
  	[
  		6431,
  		6431
  	],
  	[
  		6444,
  		6447
  	],
  	[
  		6460,
  		6469
  	],
  	[
  		6480,
  		6607
  	],
  	[
  		6618,
  		6655
  	],
  	[
  		6684,
  		6740
  	],
  	[
  		6751,
  		6751
  	],
  	[
  		6781,
  		6782
  	],
  	[
  		6794,
  		6799
  	],
  	[
  		6810,
  		6831
  	],
  	[
  		6849,
  		6911
  	],
  	[
  		6988,
  		6991
  	],
  	[
  		7002,
  		7018
  	],
  	[
  		7028,
  		7039
  	],
  	[
  		7156,
  		7167
  	],
  	[
  		7224,
  		7231
  	],
  	[
  		7242,
  		7244
  	],
  	[
  		7294,
  		7295
  	],
  	[
  		7305,
  		7311
  	],
  	[
  		7355,
  		7356
  	],
  	[
  		7360,
  		7375
  	],
  	[
  		7379,
  		7379
  	],
  	[
  		7419,
  		7423
  	],
  	[
  		7674,
  		7674
  	],
  	[
  		7958,
  		7959
  	],
  	[
  		7966,
  		7967
  	],
  	[
  		8006,
  		8007
  	],
  	[
  		8014,
  		8015
  	],
  	[
  		8024,
  		8024
  	],
  	[
  		8026,
  		8026
  	],
  	[
  		8028,
  		8028
  	],
  	[
  		8030,
  		8030
  	],
  	[
  		8062,
  		8063
  	],
  	[
  		8117,
  		8117
  	],
  	[
  		8125,
  		8125
  	],
  	[
  		8127,
  		8129
  	],
  	[
  		8133,
  		8133
  	],
  	[
  		8141,
  		8143
  	],
  	[
  		8148,
  		8149
  	],
  	[
  		8156,
  		8159
  	],
  	[
  		8173,
  		8177
  	],
  	[
  		8181,
  		8181
  	],
  	[
  		8189,
  		8191
  	],
  	[
  		8199,
  		8199
  	],
  	[
  		8203,
  		8203
  	],
  	[
  		8208,
  		8215
  	],
  	[
  		8218,
  		8227
  	],
  	[
  		8229,
  		8230
  	],
  	[
  		8240,
  		8254
  	],
  	[
  		8257,
  		8259
  	],
  	[
  		8261,
  		8275
  	],
  	[
  		8277,
  		8286
  	],
  	[
  		8293,
  		8293
  	],
  	[
  		8304,
  		8304
  	],
  	[
  		8306,
  		8318
  	],
  	[
  		8320,
  		8335
  	],
  	[
  		8349,
  		8399
  	],
  	[
  		8433,
  		8449
  	],
  	[
  		8451,
  		8454
  	],
  	[
  		8456,
  		8457
  	],
  	[
  		8468,
  		8468
  	],
  	[
  		8470,
  		8472
  	],
  	[
  		8478,
  		8483
  	],
  	[
  		8485,
  		8485
  	],
  	[
  		8487,
  		8487
  	],
  	[
  		8489,
  		8489
  	],
  	[
  		8494,
  		8494
  	],
  	[
  		8506,
  		8507
  	],
  	[
  		8512,
  		8516
  	],
  	[
  		8522,
  		8525
  	],
  	[
  		8527,
  		8543
  	],
  	[
  		8585,
  		9397
  	],
  	[
  		9450,
  		11263
  	],
  	[
  		11311,
  		11311
  	],
  	[
  		11359,
  		11359
  	],
  	[
  		11493,
  		11498
  	],
  	[
  		11508,
  		11519
  	],
  	[
  		11558,
  		11558
  	],
  	[
  		11560,
  		11564
  	],
  	[
  		11566,
  		11567
  	],
  	[
  		11624,
  		11630
  	],
  	[
  		11632,
  		11646
  	],
  	[
  		11671,
  		11679
  	],
  	[
  		11687,
  		11687
  	],
  	[
  		11695,
  		11695
  	],
  	[
  		11703,
  		11703
  	],
  	[
  		11711,
  		11711
  	],
  	[
  		11719,
  		11719
  	],
  	[
  		11727,
  		11727
  	],
  	[
  		11735,
  		11735
  	],
  	[
  		11743,
  		11743
  	],
  	[
  		11776,
  		11822
  	],
  	[
  		11824,
  		12287
  	],
  	[
  		12289,
  		12292
  	],
  	[
  		12294,
  		12329
  	],
  	[
  		12336,
  		12336
  	],
  	[
  		12342,
  		12346
  	],
  	[
  		12349,
  		12440
  	],
  	[
  		12445,
  		12447
  	],
  	[
  		12539,
  		12539
  	],
  	[
  		12544,
  		12548
  	],
  	[
  		12592,
  		12592
  	],
  	[
  		12687,
  		12703
  	],
  	[
  		12736,
  		12783
  	],
  	[
  		12800,
  		13007
  	],
  	[
  		13055,
  		13055
  	],
  	[
  		13144,
  		40959
  	],
  	[
  		42125,
  		42191
  	],
  	[
  		42238,
  		42239
  	],
  	[
  		42509,
  		42511
  	],
  	[
  		42540,
  		42559
  	],
  	[
  		42611,
  		42611
  	],
  	[
  		42622,
  		42622
  	],
  	[
  		42738,
  		42759
  	],
  	[
  		42944,
  		42945
  	],
  	[
  		42955,
  		42996
  	],
  	[
  		43048,
  		43051
  	],
  	[
  		43053,
  		43071
  	],
  	[
  		43124,
  		43135
  	],
  	[
  		43206,
  		43215
  	],
  	[
  		43226,
  		43231
  	],
  	[
  		43256,
  		43258
  	],
  	[
  		43260,
  		43260
  	],
  	[
  		43310,
  		43311
  	],
  	[
  		43348,
  		43359
  	],
  	[
  		43389,
  		43391
  	],
  	[
  		43457,
  		43470
  	],
  	[
  		43482,
  		43492
  	],
  	[
  		43494,
  		43503
  	],
  	[
  		43514,
  		43519
  	],
  	[
  		43575,
  		43583
  	],
  	[
  		43598,
  		43599
  	],
  	[
  		43610,
  		43642
  	],
  	[
  		43646,
  		43695
  	],
  	[
  		43697,
  		43697
  	],
  	[
  		43701,
  		43702
  	],
  	[
  		43705,
  		43709
  	],
  	[
  		43712,
  		43712
  	],
  	[
  		43714,
  		43743
  	],
  	[
  		43760,
  		43761
  	],
  	[
  		43767,
  		43776
  	],
  	[
  		43783,
  		43784
  	],
  	[
  		43791,
  		43792
  	],
  	[
  		43799,
  		43807
  	],
  	[
  		43815,
  		43815
  	],
  	[
  		43823,
  		43823
  	],
  	[
  		43882,
  		43887
  	],
  	[
  		44011,
  		44011
  	],
  	[
  		44014,
  		44015
  	],
  	[
  		44026,
  		44031
  	],
  	[
  		55204,
  		55215
  	],
  	[
  		55239,
  		55242
  	],
  	[
  		55292,
  		64255
  	],
  	[
  		64263,
  		64274
  	],
  	[
  		64280,
  		64284
  	],
  	[
  		64297,
  		64297
  	],
  	[
  		64311,
  		64311
  	],
  	[
  		64317,
  		64317
  	],
  	[
  		64319,
  		64319
  	],
  	[
  		64322,
  		64322
  	],
  	[
  		64325,
  		64325
  	],
  	[
  		64434,
  		64466
  	],
  	[
  		64830,
  		64847
  	],
  	[
  		64912,
  		64913
  	],
  	[
  		64968,
  		65007
  	],
  	[
  		65020,
  		65023
  	],
  	[
  		65041,
  		65042
  	],
  	[
  		65045,
  		65055
  	],
  	[
  		65072,
  		65074
  	],
  	[
  		65077,
  		65100
  	],
  	[
  		65105,
  		65105
  	],
  	[
  		65107,
  		65107
  	],
  	[
  		65110,
  		65135
  	],
  	[
  		65141,
  		65141
  	],
  	[
  		65277,
  		65278
  	],
  	[
  		65280,
  		65286
  	],
  	[
  		65288,
  		65291
  	],
  	[
  		65293,
  		65293
  	],
  	[
  		65295,
  		65295
  	],
  	[
  		65308,
  		65312
  	],
  	[
  		65339,
  		65342
  	],
  	[
  		65344,
  		65344
  	],
  	[
  		65371,
  		65381
  	],
  	[
  		65471,
  		65473
  	],
  	[
  		65480,
  		65481
  	],
  	[
  		65488,
  		65489
  	],
  	[
  		65496,
  		65497
  	],
  	[
  		65501,
  		65528
  	],
  	[
  		65532,
  		65535
  	],
  	[
  		65548,
  		65548
  	],
  	[
  		65575,
  		65575
  	],
  	[
  		65595,
  		65595
  	],
  	[
  		65598,
  		65598
  	],
  	[
  		65614,
  		65615
  	],
  	[
  		65630,
  		65663
  	],
  	[
  		65787,
  		65855
  	],
  	[
  		65909,
  		66044
  	],
  	[
  		66046,
  		66175
  	],
  	[
  		66205,
  		66207
  	],
  	[
  		66257,
  		66271
  	],
  	[
  		66273,
  		66303
  	],
  	[
  		66336,
  		66348
  	],
  	[
  		66379,
  		66383
  	],
  	[
  		66427,
  		66431
  	],
  	[
  		66462,
  		66463
  	],
  	[
  		66500,
  		66503
  	],
  	[
  		66512,
  		66512
  	],
  	[
  		66518,
  		66559
  	],
  	[
  		66718,
  		66719
  	],
  	[
  		66730,
  		66735
  	],
  	[
  		66772,
  		66775
  	],
  	[
  		66812,
  		66815
  	],
  	[
  		66856,
  		66863
  	],
  	[
  		66916,
  		67071
  	],
  	[
  		67383,
  		67391
  	],
  	[
  		67414,
  		67423
  	],
  	[
  		67432,
  		67583
  	],
  	[
  		67590,
  		67591
  	],
  	[
  		67593,
  		67593
  	],
  	[
  		67638,
  		67638
  	],
  	[
  		67641,
  		67643
  	],
  	[
  		67645,
  		67646
  	],
  	[
  		67670,
  		67679
  	],
  	[
  		67703,
  		67711
  	],
  	[
  		67743,
  		67807
  	],
  	[
  		67827,
  		67827
  	],
  	[
  		67830,
  		67839
  	],
  	[
  		67862,
  		67871
  	],
  	[
  		67898,
  		67967
  	],
  	[
  		68024,
  		68029
  	],
  	[
  		68032,
  		68095
  	],
  	[
  		68100,
  		68100
  	],
  	[
  		68103,
  		68107
  	],
  	[
  		68116,
  		68116
  	],
  	[
  		68120,
  		68120
  	],
  	[
  		68150,
  		68151
  	],
  	[
  		68155,
  		68158
  	],
  	[
  		68160,
  		68191
  	],
  	[
  		68221,
  		68223
  	],
  	[
  		68253,
  		68287
  	],
  	[
  		68296,
  		68296
  	],
  	[
  		68327,
  		68351
  	],
  	[
  		68406,
  		68415
  	],
  	[
  		68438,
  		68447
  	],
  	[
  		68467,
  		68479
  	],
  	[
  		68498,
  		68607
  	],
  	[
  		68681,
  		68735
  	],
  	[
  		68787,
  		68799
  	],
  	[
  		68851,
  		68863
  	],
  	[
  		68904,
  		68911
  	],
  	[
  		68922,
  		69247
  	],
  	[
  		69290,
  		69290
  	],
  	[
  		69293,
  		69295
  	],
  	[
  		69298,
  		69375
  	],
  	[
  		69405,
  		69414
  	],
  	[
  		69416,
  		69423
  	],
  	[
  		69457,
  		69551
  	],
  	[
  		69573,
  		69599
  	],
  	[
  		69623,
  		69631
  	],
  	[
  		69703,
  		69733
  	],
  	[
  		69744,
  		69758
  	],
  	[
  		69819,
  		69820
  	],
  	[
  		69822,
  		69836
  	],
  	[
  		69838,
  		69839
  	],
  	[
  		69865,
  		69871
  	],
  	[
  		69882,
  		69887
  	],
  	[
  		69941,
  		69941
  	],
  	[
  		69952,
  		69955
  	],
  	[
  		69960,
  		69967
  	],
  	[
  		70004,
  		70005
  	],
  	[
  		70007,
  		70015
  	],
  	[
  		70085,
  		70088
  	],
  	[
  		70093,
  		70093
  	],
  	[
  		70107,
  		70107
  	],
  	[
  		70109,
  		70143
  	],
  	[
  		70162,
  		70162
  	],
  	[
  		70200,
  		70205
  	],
  	[
  		70207,
  		70271
  	],
  	[
  		70279,
  		70279
  	],
  	[
  		70281,
  		70281
  	],
  	[
  		70286,
  		70286
  	],
  	[
  		70302,
  		70302
  	],
  	[
  		70313,
  		70319
  	],
  	[
  		70379,
  		70383
  	],
  	[
  		70394,
  		70399
  	],
  	[
  		70404,
  		70404
  	],
  	[
  		70413,
  		70414
  	],
  	[
  		70417,
  		70418
  	],
  	[
  		70441,
  		70441
  	],
  	[
  		70449,
  		70449
  	],
  	[
  		70452,
  		70452
  	],
  	[
  		70458,
  		70458
  	],
  	[
  		70469,
  		70470
  	],
  	[
  		70473,
  		70474
  	],
  	[
  		70478,
  		70479
  	],
  	[
  		70481,
  		70486
  	],
  	[
  		70488,
  		70492
  	],
  	[
  		70500,
  		70501
  	],
  	[
  		70509,
  		70511
  	],
  	[
  		70517,
  		70655
  	],
  	[
  		70731,
  		70735
  	],
  	[
  		70746,
  		70749
  	],
  	[
  		70754,
  		70783
  	],
  	[
  		70854,
  		70854
  	],
  	[
  		70856,
  		70863
  	],
  	[
  		70874,
  		71039
  	],
  	[
  		71094,
  		71095
  	],
  	[
  		71105,
  		71127
  	],
  	[
  		71134,
  		71167
  	],
  	[
  		71233,
  		71235
  	],
  	[
  		71237,
  		71247
  	],
  	[
  		71258,
  		71295
  	],
  	[
  		71353,
  		71359
  	],
  	[
  		71370,
  		71452
  	],
  	[
  		71468,
  		71471
  	],
  	[
  		71482,
  		71679
  	],
  	[
  		71739,
  		71839
  	],
  	[
  		71914,
  		71934
  	],
  	[
  		71943,
  		71944
  	],
  	[
  		71946,
  		71947
  	],
  	[
  		71956,
  		71956
  	],
  	[
  		71959,
  		71959
  	],
  	[
  		71990,
  		71990
  	],
  	[
  		71993,
  		71994
  	],
  	[
  		72004,
  		72015
  	],
  	[
  		72026,
  		72095
  	],
  	[
  		72104,
  		72105
  	],
  	[
  		72152,
  		72153
  	],
  	[
  		72162,
  		72162
  	],
  	[
  		72165,
  		72191
  	],
  	[
  		72255,
  		72262
  	],
  	[
  		72264,
  		72271
  	],
  	[
  		72346,
  		72348
  	],
  	[
  		72350,
  		72383
  	],
  	[
  		72441,
  		72703
  	],
  	[
  		72713,
  		72713
  	],
  	[
  		72759,
  		72759
  	],
  	[
  		72769,
  		72783
  	],
  	[
  		72794,
  		72817
  	],
  	[
  		72848,
  		72849
  	],
  	[
  		72872,
  		72872
  	],
  	[
  		72887,
  		72959
  	],
  	[
  		72967,
  		72967
  	],
  	[
  		72970,
  		72970
  	],
  	[
  		73015,
  		73017
  	],
  	[
  		73019,
  		73019
  	],
  	[
  		73022,
  		73022
  	],
  	[
  		73032,
  		73039
  	],
  	[
  		73050,
  		73055
  	],
  	[
  		73062,
  		73062
  	],
  	[
  		73065,
  		73065
  	],
  	[
  		73103,
  		73103
  	],
  	[
  		73106,
  		73106
  	],
  	[
  		73113,
  		73119
  	],
  	[
  		73130,
  		73439
  	],
  	[
  		73463,
  		73647
  	],
  	[
  		73649,
  		73727
  	],
  	[
  		74650,
  		74751
  	],
  	[
  		74863,
  		74879
  	],
  	[
  		75076,
  		77823
  	],
  	[
  		78895,
  		78895
  	],
  	[
  		78905,
  		82943
  	],
  	[
  		83527,
  		92159
  	],
  	[
  		92729,
  		92735
  	],
  	[
  		92767,
  		92767
  	],
  	[
  		92778,
  		92879
  	],
  	[
  		92910,
  		92911
  	],
  	[
  		92917,
  		92927
  	],
  	[
  		92983,
  		92991
  	],
  	[
  		92996,
  		93007
  	],
  	[
  		93018,
  		93026
  	],
  	[
  		93048,
  		93052
  	],
  	[
  		93072,
  		93759
  	],
  	[
  		93824,
  		93951
  	],
  	[
  		94027,
  		94030
  	],
  	[
  		94088,
  		94094
  	],
  	[
  		94112,
  		94175
  	],
  	[
  		94178,
  		94178
  	],
  	[
  		94181,
  		94191
  	],
  	[
  		94194,
  		110591
  	],
  	[
  		110593,
  		110947
  	],
  	[
  		110952,
  		113663
  	],
  	[
  		113771,
  		113775
  	],
  	[
  		113789,
  		113791
  	],
  	[
  		113801,
  		113807
  	],
  	[
  		113818,
  		113820
  	],
  	[
  		113823,
  		113823
  	],
  	[
  		113828,
  		119140
  	],
  	[
  		119146,
  		119148
  	],
  	[
  		119171,
  		119172
  	],
  	[
  		119180,
  		119209
  	],
  	[
  		119214,
  		119361
  	],
  	[
  		119365,
  		119807
  	],
  	[
  		119893,
  		119893
  	],
  	[
  		119965,
  		119965
  	],
  	[
  		119968,
  		119969
  	],
  	[
  		119971,
  		119972
  	],
  	[
  		119975,
  		119976
  	],
  	[
  		119981,
  		119981
  	],
  	[
  		119994,
  		119994
  	],
  	[
  		119996,
  		119996
  	],
  	[
  		120004,
  		120004
  	],
  	[
  		120070,
  		120070
  	],
  	[
  		120075,
  		120076
  	],
  	[
  		120085,
  		120085
  	],
  	[
  		120093,
  		120093
  	],
  	[
  		120122,
  		120122
  	],
  	[
  		120127,
  		120127
  	],
  	[
  		120133,
  		120133
  	],
  	[
  		120135,
  		120137
  	],
  	[
  		120145,
  		120145
  	],
  	[
  		120486,
  		120487
  	],
  	[
  		120513,
  		120513
  	],
  	[
  		120539,
  		120539
  	],
  	[
  		120571,
  		120571
  	],
  	[
  		120597,
  		120597
  	],
  	[
  		120629,
  		120629
  	],
  	[
  		120655,
  		120655
  	],
  	[
  		120687,
  		120687
  	],
  	[
  		120713,
  		120713
  	],
  	[
  		120745,
  		120745
  	],
  	[
  		120771,
  		120771
  	],
  	[
  		120780,
  		120781
  	],
  	[
  		120832,
  		121343
  	],
  	[
  		121399,
  		121402
  	],
  	[
  		121453,
  		121460
  	],
  	[
  		121462,
  		121475
  	],
  	[
  		121477,
  		121498
  	],
  	[
  		121504,
  		121504
  	],
  	[
  		121520,
  		122879
  	],
  	[
  		122887,
  		122887
  	],
  	[
  		122905,
  		122906
  	],
  	[
  		122914,
  		122914
  	],
  	[
  		122917,
  		122917
  	],
  	[
  		122923,
  		123135
  	],
  	[
  		123181,
  		123183
  	],
  	[
  		123198,
  		123199
  	],
  	[
  		123210,
  		123213
  	],
  	[
  		123215,
  		123583
  	],
  	[
  		123642,
  		124927
  	],
  	[
  		125125,
  		125135
  	],
  	[
  		125143,
  		125183
  	],
  	[
  		125260,
  		125263
  	],
  	[
  		125274,
  		126463
  	],
  	[
  		126468,
  		126468
  	],
  	[
  		126496,
  		126496
  	],
  	[
  		126499,
  		126499
  	],
  	[
  		126501,
  		126502
  	],
  	[
  		126504,
  		126504
  	],
  	[
  		126515,
  		126515
  	],
  	[
  		126520,
  		126520
  	],
  	[
  		126522,
  		126522
  	],
  	[
  		126524,
  		126529
  	],
  	[
  		126531,
  		126534
  	],
  	[
  		126536,
  		126536
  	],
  	[
  		126538,
  		126538
  	],
  	[
  		126540,
  		126540
  	],
  	[
  		126544,
  		126544
  	],
  	[
  		126547,
  		126547
  	],
  	[
  		126549,
  		126550
  	],
  	[
  		126552,
  		126552
  	],
  	[
  		126554,
  		126554
  	],
  	[
  		126556,
  		126556
  	],
  	[
  		126558,
  		126558
  	],
  	[
  		126560,
  		126560
  	],
  	[
  		126563,
  		126563
  	],
  	[
  		126565,
  		126566
  	],
  	[
  		126571,
  		126571
  	],
  	[
  		126579,
  		126579
  	],
  	[
  		126584,
  		126584
  	],
  	[
  		126589,
  		126589
  	],
  	[
  		126591,
  		126591
  	],
  	[
  		126602,
  		126602
  	],
  	[
  		126620,
  		126624
  	],
  	[
  		126628,
  		126628
  	],
  	[
  		126634,
  		126634
  	],
  	[
  		126652,
  		127279
  	],
  	[
  		127306,
  		127311
  	],
  	[
  		127338,
  		127343
  	],
  	[
  		127370,
  		127461
  	],
  	[
  		127488,
  		127994
  	],
  	[
  		128000,
  		130031
  	],
  	[
  		130042,
  		917504
  	],
  	[
  		917506,
  		917535
  	],
  	[
  		917632,
  		917759
  	],
  	[
  		918000,
  		1114111
  	]
  ],
  	"Word_Break/MidLetter": [
  	[
  		58,
  		58
  	],
  	[
  		183,
  		183
  	],
  	[
  		903,
  		903
  	],
  	[
  		1375,
  		1375
  	],
  	[
  		1524,
  		1524
  	],
  	[
  		8231,
  		8231
  	],
  	[
  		65043,
  		65043
  	],
  	[
  		65109,
  		65109
  	],
  	[
  		65306,
  		65306
  	]
  ],
  	"Word_Break/LF": [
  	[
  		10,
  		10
  	]
  ],
  	"Word_Break/Katakana": [
  	[
  		12337,
  		12341
  	],
  	[
  		12443,
  		12444
  	],
  	[
  		12448,
  		12538
  	],
  	[
  		12540,
  		12543
  	],
  	[
  		12784,
  		12799
  	],
  	[
  		13008,
  		13054
  	],
  	[
  		13056,
  		13143
  	],
  	[
  		65382,
  		65437
  	],
  	[
  		110592,
  		110592
  	],
  	[
  		110948,
  		110951
  	]
  ],
  	"Word_Break/WSegSpace": [
  	[
  		32,
  		32
  	],
  	[
  		5760,
  		5760
  	],
  	[
  		8192,
  		8198
  	],
  	[
  		8200,
  		8202
  	],
  	[
  		8287,
  		8287
  	],
  	[
  		12288,
  		12288
  	]
  ],
  	"Word_Break/Extend": [
  	[
  		768,
  		879
  	],
  	[
  		1155,
  		1161
  	],
  	[
  		1425,
  		1469
  	],
  	[
  		1471,
  		1471
  	],
  	[
  		1473,
  		1474
  	],
  	[
  		1476,
  		1477
  	],
  	[
  		1479,
  		1479
  	],
  	[
  		1552,
  		1562
  	],
  	[
  		1611,
  		1631
  	],
  	[
  		1648,
  		1648
  	],
  	[
  		1750,
  		1756
  	],
  	[
  		1759,
  		1764
  	],
  	[
  		1767,
  		1768
  	],
  	[
  		1770,
  		1773
  	],
  	[
  		1809,
  		1809
  	],
  	[
  		1840,
  		1866
  	],
  	[
  		1958,
  		1968
  	],
  	[
  		2027,
  		2035
  	],
  	[
  		2045,
  		2045
  	],
  	[
  		2070,
  		2073
  	],
  	[
  		2075,
  		2083
  	],
  	[
  		2085,
  		2087
  	],
  	[
  		2089,
  		2093
  	],
  	[
  		2137,
  		2139
  	],
  	[
  		2259,
  		2273
  	],
  	[
  		2275,
  		2307
  	],
  	[
  		2362,
  		2364
  	],
  	[
  		2366,
  		2383
  	],
  	[
  		2385,
  		2391
  	],
  	[
  		2402,
  		2403
  	],
  	[
  		2433,
  		2435
  	],
  	[
  		2492,
  		2492
  	],
  	[
  		2494,
  		2500
  	],
  	[
  		2503,
  		2504
  	],
  	[
  		2507,
  		2509
  	],
  	[
  		2519,
  		2519
  	],
  	[
  		2530,
  		2531
  	],
  	[
  		2558,
  		2558
  	],
  	[
  		2561,
  		2563
  	],
  	[
  		2620,
  		2620
  	],
  	[
  		2622,
  		2626
  	],
  	[
  		2631,
  		2632
  	],
  	[
  		2635,
  		2637
  	],
  	[
  		2641,
  		2641
  	],
  	[
  		2672,
  		2673
  	],
  	[
  		2677,
  		2677
  	],
  	[
  		2689,
  		2691
  	],
  	[
  		2748,
  		2748
  	],
  	[
  		2750,
  		2757
  	],
  	[
  		2759,
  		2761
  	],
  	[
  		2763,
  		2765
  	],
  	[
  		2786,
  		2787
  	],
  	[
  		2810,
  		2815
  	],
  	[
  		2817,
  		2819
  	],
  	[
  		2876,
  		2876
  	],
  	[
  		2878,
  		2884
  	],
  	[
  		2887,
  		2888
  	],
  	[
  		2891,
  		2893
  	],
  	[
  		2901,
  		2903
  	],
  	[
  		2914,
  		2915
  	],
  	[
  		2946,
  		2946
  	],
  	[
  		3006,
  		3010
  	],
  	[
  		3014,
  		3016
  	],
  	[
  		3018,
  		3021
  	],
  	[
  		3031,
  		3031
  	],
  	[
  		3072,
  		3076
  	],
  	[
  		3134,
  		3140
  	],
  	[
  		3142,
  		3144
  	],
  	[
  		3146,
  		3149
  	],
  	[
  		3157,
  		3158
  	],
  	[
  		3170,
  		3171
  	],
  	[
  		3201,
  		3203
  	],
  	[
  		3260,
  		3260
  	],
  	[
  		3262,
  		3268
  	],
  	[
  		3270,
  		3272
  	],
  	[
  		3274,
  		3277
  	],
  	[
  		3285,
  		3286
  	],
  	[
  		3298,
  		3299
  	],
  	[
  		3328,
  		3331
  	],
  	[
  		3387,
  		3388
  	],
  	[
  		3390,
  		3396
  	],
  	[
  		3398,
  		3400
  	],
  	[
  		3402,
  		3405
  	],
  	[
  		3415,
  		3415
  	],
  	[
  		3426,
  		3427
  	],
  	[
  		3457,
  		3459
  	],
  	[
  		3530,
  		3530
  	],
  	[
  		3535,
  		3540
  	],
  	[
  		3542,
  		3542
  	],
  	[
  		3544,
  		3551
  	],
  	[
  		3570,
  		3571
  	],
  	[
  		3633,
  		3633
  	],
  	[
  		3636,
  		3642
  	],
  	[
  		3655,
  		3662
  	],
  	[
  		3761,
  		3761
  	],
  	[
  		3764,
  		3772
  	],
  	[
  		3784,
  		3789
  	],
  	[
  		3864,
  		3865
  	],
  	[
  		3893,
  		3893
  	],
  	[
  		3895,
  		3895
  	],
  	[
  		3897,
  		3897
  	],
  	[
  		3902,
  		3903
  	],
  	[
  		3953,
  		3972
  	],
  	[
  		3974,
  		3975
  	],
  	[
  		3981,
  		3991
  	],
  	[
  		3993,
  		4028
  	],
  	[
  		4038,
  		4038
  	],
  	[
  		4139,
  		4158
  	],
  	[
  		4182,
  		4185
  	],
  	[
  		4190,
  		4192
  	],
  	[
  		4194,
  		4196
  	],
  	[
  		4199,
  		4205
  	],
  	[
  		4209,
  		4212
  	],
  	[
  		4226,
  		4237
  	],
  	[
  		4239,
  		4239
  	],
  	[
  		4250,
  		4253
  	],
  	[
  		4957,
  		4959
  	],
  	[
  		5906,
  		5908
  	],
  	[
  		5938,
  		5940
  	],
  	[
  		5970,
  		5971
  	],
  	[
  		6002,
  		6003
  	],
  	[
  		6068,
  		6099
  	],
  	[
  		6109,
  		6109
  	],
  	[
  		6155,
  		6157
  	],
  	[
  		6277,
  		6278
  	],
  	[
  		6313,
  		6313
  	],
  	[
  		6432,
  		6443
  	],
  	[
  		6448,
  		6459
  	],
  	[
  		6679,
  		6683
  	],
  	[
  		6741,
  		6750
  	],
  	[
  		6752,
  		6780
  	],
  	[
  		6783,
  		6783
  	],
  	[
  		6832,
  		6848
  	],
  	[
  		6912,
  		6916
  	],
  	[
  		6964,
  		6980
  	],
  	[
  		7019,
  		7027
  	],
  	[
  		7040,
  		7042
  	],
  	[
  		7073,
  		7085
  	],
  	[
  		7142,
  		7155
  	],
  	[
  		7204,
  		7223
  	],
  	[
  		7376,
  		7378
  	],
  	[
  		7380,
  		7400
  	],
  	[
  		7405,
  		7405
  	],
  	[
  		7412,
  		7412
  	],
  	[
  		7415,
  		7417
  	],
  	[
  		7616,
  		7673
  	],
  	[
  		7675,
  		7679
  	],
  	[
  		8204,
  		8204
  	],
  	[
  		8400,
  		8432
  	],
  	[
  		11503,
  		11505
  	],
  	[
  		11647,
  		11647
  	],
  	[
  		11744,
  		11775
  	],
  	[
  		12330,
  		12335
  	],
  	[
  		12441,
  		12442
  	],
  	[
  		42607,
  		42610
  	],
  	[
  		42612,
  		42621
  	],
  	[
  		42654,
  		42655
  	],
  	[
  		42736,
  		42737
  	],
  	[
  		43010,
  		43010
  	],
  	[
  		43014,
  		43014
  	],
  	[
  		43019,
  		43019
  	],
  	[
  		43043,
  		43047
  	],
  	[
  		43052,
  		43052
  	],
  	[
  		43136,
  		43137
  	],
  	[
  		43188,
  		43205
  	],
  	[
  		43232,
  		43249
  	],
  	[
  		43263,
  		43263
  	],
  	[
  		43302,
  		43309
  	],
  	[
  		43335,
  		43347
  	],
  	[
  		43392,
  		43395
  	],
  	[
  		43443,
  		43456
  	],
  	[
  		43493,
  		43493
  	],
  	[
  		43561,
  		43574
  	],
  	[
  		43587,
  		43587
  	],
  	[
  		43596,
  		43597
  	],
  	[
  		43643,
  		43645
  	],
  	[
  		43696,
  		43696
  	],
  	[
  		43698,
  		43700
  	],
  	[
  		43703,
  		43704
  	],
  	[
  		43710,
  		43711
  	],
  	[
  		43713,
  		43713
  	],
  	[
  		43755,
  		43759
  	],
  	[
  		43765,
  		43766
  	],
  	[
  		44003,
  		44010
  	],
  	[
  		44012,
  		44013
  	],
  	[
  		64286,
  		64286
  	],
  	[
  		65024,
  		65039
  	],
  	[
  		65056,
  		65071
  	],
  	[
  		65438,
  		65439
  	],
  	[
  		66045,
  		66045
  	],
  	[
  		66272,
  		66272
  	],
  	[
  		66422,
  		66426
  	],
  	[
  		68097,
  		68099
  	],
  	[
  		68101,
  		68102
  	],
  	[
  		68108,
  		68111
  	],
  	[
  		68152,
  		68154
  	],
  	[
  		68159,
  		68159
  	],
  	[
  		68325,
  		68326
  	],
  	[
  		68900,
  		68903
  	],
  	[
  		69291,
  		69292
  	],
  	[
  		69446,
  		69456
  	],
  	[
  		69632,
  		69634
  	],
  	[
  		69688,
  		69702
  	],
  	[
  		69759,
  		69762
  	],
  	[
  		69808,
  		69818
  	],
  	[
  		69888,
  		69890
  	],
  	[
  		69927,
  		69940
  	],
  	[
  		69957,
  		69958
  	],
  	[
  		70003,
  		70003
  	],
  	[
  		70016,
  		70018
  	],
  	[
  		70067,
  		70080
  	],
  	[
  		70089,
  		70092
  	],
  	[
  		70094,
  		70095
  	],
  	[
  		70188,
  		70199
  	],
  	[
  		70206,
  		70206
  	],
  	[
  		70367,
  		70378
  	],
  	[
  		70400,
  		70403
  	],
  	[
  		70459,
  		70460
  	],
  	[
  		70462,
  		70468
  	],
  	[
  		70471,
  		70472
  	],
  	[
  		70475,
  		70477
  	],
  	[
  		70487,
  		70487
  	],
  	[
  		70498,
  		70499
  	],
  	[
  		70502,
  		70508
  	],
  	[
  		70512,
  		70516
  	],
  	[
  		70709,
  		70726
  	],
  	[
  		70750,
  		70750
  	],
  	[
  		70832,
  		70851
  	],
  	[
  		71087,
  		71093
  	],
  	[
  		71096,
  		71104
  	],
  	[
  		71132,
  		71133
  	],
  	[
  		71216,
  		71232
  	],
  	[
  		71339,
  		71351
  	],
  	[
  		71453,
  		71467
  	],
  	[
  		71724,
  		71738
  	],
  	[
  		71984,
  		71989
  	],
  	[
  		71991,
  		71992
  	],
  	[
  		71995,
  		71998
  	],
  	[
  		72000,
  		72000
  	],
  	[
  		72002,
  		72003
  	],
  	[
  		72145,
  		72151
  	],
  	[
  		72154,
  		72160
  	],
  	[
  		72164,
  		72164
  	],
  	[
  		72193,
  		72202
  	],
  	[
  		72243,
  		72249
  	],
  	[
  		72251,
  		72254
  	],
  	[
  		72263,
  		72263
  	],
  	[
  		72273,
  		72283
  	],
  	[
  		72330,
  		72345
  	],
  	[
  		72751,
  		72758
  	],
  	[
  		72760,
  		72767
  	],
  	[
  		72850,
  		72871
  	],
  	[
  		72873,
  		72886
  	],
  	[
  		73009,
  		73014
  	],
  	[
  		73018,
  		73018
  	],
  	[
  		73020,
  		73021
  	],
  	[
  		73023,
  		73029
  	],
  	[
  		73031,
  		73031
  	],
  	[
  		73098,
  		73102
  	],
  	[
  		73104,
  		73105
  	],
  	[
  		73107,
  		73111
  	],
  	[
  		73459,
  		73462
  	],
  	[
  		92912,
  		92916
  	],
  	[
  		92976,
  		92982
  	],
  	[
  		94031,
  		94031
  	],
  	[
  		94033,
  		94087
  	],
  	[
  		94095,
  		94098
  	],
  	[
  		94180,
  		94180
  	],
  	[
  		94192,
  		94193
  	],
  	[
  		113821,
  		113822
  	],
  	[
  		119141,
  		119145
  	],
  	[
  		119149,
  		119154
  	],
  	[
  		119163,
  		119170
  	],
  	[
  		119173,
  		119179
  	],
  	[
  		119210,
  		119213
  	],
  	[
  		119362,
  		119364
  	],
  	[
  		121344,
  		121398
  	],
  	[
  		121403,
  		121452
  	],
  	[
  		121461,
  		121461
  	],
  	[
  		121476,
  		121476
  	],
  	[
  		121499,
  		121503
  	],
  	[
  		121505,
  		121519
  	],
  	[
  		122880,
  		122886
  	],
  	[
  		122888,
  		122904
  	],
  	[
  		122907,
  		122913
  	],
  	[
  		122915,
  		122916
  	],
  	[
  		122918,
  		122922
  	],
  	[
  		123184,
  		123190
  	],
  	[
  		123628,
  		123631
  	],
  	[
  		125136,
  		125142
  	],
  	[
  		125252,
  		125258
  	],
  	[
  		127995,
  		127999
  	],
  	[
  		917536,
  		917631
  	],
  	[
  		917760,
  		917999
  	]
  ],
  	"Word_Break/MidNumLet": [
  	[
  		46,
  		46
  	],
  	[
  		8216,
  		8217
  	],
  	[
  		8228,
  		8228
  	],
  	[
  		65106,
  		65106
  	],
  	[
  		65287,
  		65287
  	],
  	[
  		65294,
  		65294
  	]
  ],
  	"Word_Break/ALetter": [
  	[
  		65,
  		90
  	],
  	[
  		97,
  		122
  	],
  	[
  		170,
  		170
  	],
  	[
  		181,
  		181
  	],
  	[
  		186,
  		186
  	],
  	[
  		192,
  		214
  	],
  	[
  		216,
  		246
  	],
  	[
  		248,
  		727
  	],
  	[
  		734,
  		767
  	],
  	[
  		880,
  		884
  	],
  	[
  		886,
  		887
  	],
  	[
  		890,
  		893
  	],
  	[
  		895,
  		895
  	],
  	[
  		902,
  		902
  	],
  	[
  		904,
  		906
  	],
  	[
  		908,
  		908
  	],
  	[
  		910,
  		929
  	],
  	[
  		931,
  		1013
  	],
  	[
  		1015,
  		1153
  	],
  	[
  		1162,
  		1327
  	],
  	[
  		1329,
  		1366
  	],
  	[
  		1369,
  		1372
  	],
  	[
  		1374,
  		1374
  	],
  	[
  		1376,
  		1416
  	],
  	[
  		1418,
  		1418
  	],
  	[
  		1523,
  		1523
  	],
  	[
  		1568,
  		1610
  	],
  	[
  		1646,
  		1647
  	],
  	[
  		1649,
  		1747
  	],
  	[
  		1749,
  		1749
  	],
  	[
  		1765,
  		1766
  	],
  	[
  		1774,
  		1775
  	],
  	[
  		1786,
  		1788
  	],
  	[
  		1791,
  		1791
  	],
  	[
  		1808,
  		1808
  	],
  	[
  		1810,
  		1839
  	],
  	[
  		1869,
  		1957
  	],
  	[
  		1969,
  		1969
  	],
  	[
  		1994,
  		2026
  	],
  	[
  		2036,
  		2037
  	],
  	[
  		2042,
  		2042
  	],
  	[
  		2048,
  		2069
  	],
  	[
  		2074,
  		2074
  	],
  	[
  		2084,
  		2084
  	],
  	[
  		2088,
  		2088
  	],
  	[
  		2112,
  		2136
  	],
  	[
  		2144,
  		2154
  	],
  	[
  		2208,
  		2228
  	],
  	[
  		2230,
  		2247
  	],
  	[
  		2308,
  		2361
  	],
  	[
  		2365,
  		2365
  	],
  	[
  		2384,
  		2384
  	],
  	[
  		2392,
  		2401
  	],
  	[
  		2417,
  		2432
  	],
  	[
  		2437,
  		2444
  	],
  	[
  		2447,
  		2448
  	],
  	[
  		2451,
  		2472
  	],
  	[
  		2474,
  		2480
  	],
  	[
  		2482,
  		2482
  	],
  	[
  		2486,
  		2489
  	],
  	[
  		2493,
  		2493
  	],
  	[
  		2510,
  		2510
  	],
  	[
  		2524,
  		2525
  	],
  	[
  		2527,
  		2529
  	],
  	[
  		2544,
  		2545
  	],
  	[
  		2556,
  		2556
  	],
  	[
  		2565,
  		2570
  	],
  	[
  		2575,
  		2576
  	],
  	[
  		2579,
  		2600
  	],
  	[
  		2602,
  		2608
  	],
  	[
  		2610,
  		2611
  	],
  	[
  		2613,
  		2614
  	],
  	[
  		2616,
  		2617
  	],
  	[
  		2649,
  		2652
  	],
  	[
  		2654,
  		2654
  	],
  	[
  		2674,
  		2676
  	],
  	[
  		2693,
  		2701
  	],
  	[
  		2703,
  		2705
  	],
  	[
  		2707,
  		2728
  	],
  	[
  		2730,
  		2736
  	],
  	[
  		2738,
  		2739
  	],
  	[
  		2741,
  		2745
  	],
  	[
  		2749,
  		2749
  	],
  	[
  		2768,
  		2768
  	],
  	[
  		2784,
  		2785
  	],
  	[
  		2809,
  		2809
  	],
  	[
  		2821,
  		2828
  	],
  	[
  		2831,
  		2832
  	],
  	[
  		2835,
  		2856
  	],
  	[
  		2858,
  		2864
  	],
  	[
  		2866,
  		2867
  	],
  	[
  		2869,
  		2873
  	],
  	[
  		2877,
  		2877
  	],
  	[
  		2908,
  		2909
  	],
  	[
  		2911,
  		2913
  	],
  	[
  		2929,
  		2929
  	],
  	[
  		2947,
  		2947
  	],
  	[
  		2949,
  		2954
  	],
  	[
  		2958,
  		2960
  	],
  	[
  		2962,
  		2965
  	],
  	[
  		2969,
  		2970
  	],
  	[
  		2972,
  		2972
  	],
  	[
  		2974,
  		2975
  	],
  	[
  		2979,
  		2980
  	],
  	[
  		2984,
  		2986
  	],
  	[
  		2990,
  		3001
  	],
  	[
  		3024,
  		3024
  	],
  	[
  		3077,
  		3084
  	],
  	[
  		3086,
  		3088
  	],
  	[
  		3090,
  		3112
  	],
  	[
  		3114,
  		3129
  	],
  	[
  		3133,
  		3133
  	],
  	[
  		3160,
  		3162
  	],
  	[
  		3168,
  		3169
  	],
  	[
  		3200,
  		3200
  	],
  	[
  		3205,
  		3212
  	],
  	[
  		3214,
  		3216
  	],
  	[
  		3218,
  		3240
  	],
  	[
  		3242,
  		3251
  	],
  	[
  		3253,
  		3257
  	],
  	[
  		3261,
  		3261
  	],
  	[
  		3294,
  		3294
  	],
  	[
  		3296,
  		3297
  	],
  	[
  		3313,
  		3314
  	],
  	[
  		3332,
  		3340
  	],
  	[
  		3342,
  		3344
  	],
  	[
  		3346,
  		3386
  	],
  	[
  		3389,
  		3389
  	],
  	[
  		3406,
  		3406
  	],
  	[
  		3412,
  		3414
  	],
  	[
  		3423,
  		3425
  	],
  	[
  		3450,
  		3455
  	],
  	[
  		3461,
  		3478
  	],
  	[
  		3482,
  		3505
  	],
  	[
  		3507,
  		3515
  	],
  	[
  		3517,
  		3517
  	],
  	[
  		3520,
  		3526
  	],
  	[
  		3840,
  		3840
  	],
  	[
  		3904,
  		3911
  	],
  	[
  		3913,
  		3948
  	],
  	[
  		3976,
  		3980
  	],
  	[
  		4256,
  		4293
  	],
  	[
  		4295,
  		4295
  	],
  	[
  		4301,
  		4301
  	],
  	[
  		4304,
  		4346
  	],
  	[
  		4348,
  		4680
  	],
  	[
  		4682,
  		4685
  	],
  	[
  		4688,
  		4694
  	],
  	[
  		4696,
  		4696
  	],
  	[
  		4698,
  		4701
  	],
  	[
  		4704,
  		4744
  	],
  	[
  		4746,
  		4749
  	],
  	[
  		4752,
  		4784
  	],
  	[
  		4786,
  		4789
  	],
  	[
  		4792,
  		4798
  	],
  	[
  		4800,
  		4800
  	],
  	[
  		4802,
  		4805
  	],
  	[
  		4808,
  		4822
  	],
  	[
  		4824,
  		4880
  	],
  	[
  		4882,
  		4885
  	],
  	[
  		4888,
  		4954
  	],
  	[
  		4992,
  		5007
  	],
  	[
  		5024,
  		5109
  	],
  	[
  		5112,
  		5117
  	],
  	[
  		5121,
  		5740
  	],
  	[
  		5743,
  		5759
  	],
  	[
  		5761,
  		5786
  	],
  	[
  		5792,
  		5866
  	],
  	[
  		5870,
  		5880
  	],
  	[
  		5888,
  		5900
  	],
  	[
  		5902,
  		5905
  	],
  	[
  		5920,
  		5937
  	],
  	[
  		5952,
  		5969
  	],
  	[
  		5984,
  		5996
  	],
  	[
  		5998,
  		6000
  	],
  	[
  		6176,
  		6264
  	],
  	[
  		6272,
  		6276
  	],
  	[
  		6279,
  		6312
  	],
  	[
  		6314,
  		6314
  	],
  	[
  		6320,
  		6389
  	],
  	[
  		6400,
  		6430
  	],
  	[
  		6656,
  		6678
  	],
  	[
  		6917,
  		6963
  	],
  	[
  		6981,
  		6987
  	],
  	[
  		7043,
  		7072
  	],
  	[
  		7086,
  		7087
  	],
  	[
  		7098,
  		7141
  	],
  	[
  		7168,
  		7203
  	],
  	[
  		7245,
  		7247
  	],
  	[
  		7258,
  		7293
  	],
  	[
  		7296,
  		7304
  	],
  	[
  		7312,
  		7354
  	],
  	[
  		7357,
  		7359
  	],
  	[
  		7401,
  		7404
  	],
  	[
  		7406,
  		7411
  	],
  	[
  		7413,
  		7414
  	],
  	[
  		7418,
  		7418
  	],
  	[
  		7424,
  		7615
  	],
  	[
  		7680,
  		7957
  	],
  	[
  		7960,
  		7965
  	],
  	[
  		7968,
  		8005
  	],
  	[
  		8008,
  		8013
  	],
  	[
  		8016,
  		8023
  	],
  	[
  		8025,
  		8025
  	],
  	[
  		8027,
  		8027
  	],
  	[
  		8029,
  		8029
  	],
  	[
  		8031,
  		8061
  	],
  	[
  		8064,
  		8116
  	],
  	[
  		8118,
  		8124
  	],
  	[
  		8126,
  		8126
  	],
  	[
  		8130,
  		8132
  	],
  	[
  		8134,
  		8140
  	],
  	[
  		8144,
  		8147
  	],
  	[
  		8150,
  		8155
  	],
  	[
  		8160,
  		8172
  	],
  	[
  		8178,
  		8180
  	],
  	[
  		8182,
  		8188
  	],
  	[
  		8305,
  		8305
  	],
  	[
  		8319,
  		8319
  	],
  	[
  		8336,
  		8348
  	],
  	[
  		8450,
  		8450
  	],
  	[
  		8455,
  		8455
  	],
  	[
  		8458,
  		8467
  	],
  	[
  		8469,
  		8469
  	],
  	[
  		8473,
  		8477
  	],
  	[
  		8484,
  		8484
  	],
  	[
  		8486,
  		8486
  	],
  	[
  		8488,
  		8488
  	],
  	[
  		8490,
  		8493
  	],
  	[
  		8495,
  		8505
  	],
  	[
  		8508,
  		8511
  	],
  	[
  		8517,
  		8521
  	],
  	[
  		8526,
  		8526
  	],
  	[
  		8544,
  		8584
  	],
  	[
  		9398,
  		9449
  	],
  	[
  		11264,
  		11310
  	],
  	[
  		11312,
  		11358
  	],
  	[
  		11360,
  		11492
  	],
  	[
  		11499,
  		11502
  	],
  	[
  		11506,
  		11507
  	],
  	[
  		11520,
  		11557
  	],
  	[
  		11559,
  		11559
  	],
  	[
  		11565,
  		11565
  	],
  	[
  		11568,
  		11623
  	],
  	[
  		11631,
  		11631
  	],
  	[
  		11648,
  		11670
  	],
  	[
  		11680,
  		11686
  	],
  	[
  		11688,
  		11694
  	],
  	[
  		11696,
  		11702
  	],
  	[
  		11704,
  		11710
  	],
  	[
  		11712,
  		11718
  	],
  	[
  		11720,
  		11726
  	],
  	[
  		11728,
  		11734
  	],
  	[
  		11736,
  		11742
  	],
  	[
  		11823,
  		11823
  	],
  	[
  		12293,
  		12293
  	],
  	[
  		12347,
  		12348
  	],
  	[
  		12549,
  		12591
  	],
  	[
  		12593,
  		12686
  	],
  	[
  		12704,
  		12735
  	],
  	[
  		40960,
  		42124
  	],
  	[
  		42192,
  		42237
  	],
  	[
  		42240,
  		42508
  	],
  	[
  		42512,
  		42527
  	],
  	[
  		42538,
  		42539
  	],
  	[
  		42560,
  		42606
  	],
  	[
  		42623,
  		42653
  	],
  	[
  		42656,
  		42735
  	],
  	[
  		42760,
  		42943
  	],
  	[
  		42946,
  		42954
  	],
  	[
  		42997,
  		43009
  	],
  	[
  		43011,
  		43013
  	],
  	[
  		43015,
  		43018
  	],
  	[
  		43020,
  		43042
  	],
  	[
  		43072,
  		43123
  	],
  	[
  		43138,
  		43187
  	],
  	[
  		43250,
  		43255
  	],
  	[
  		43259,
  		43259
  	],
  	[
  		43261,
  		43262
  	],
  	[
  		43274,
  		43301
  	],
  	[
  		43312,
  		43334
  	],
  	[
  		43360,
  		43388
  	],
  	[
  		43396,
  		43442
  	],
  	[
  		43471,
  		43471
  	],
  	[
  		43520,
  		43560
  	],
  	[
  		43584,
  		43586
  	],
  	[
  		43588,
  		43595
  	],
  	[
  		43744,
  		43754
  	],
  	[
  		43762,
  		43764
  	],
  	[
  		43777,
  		43782
  	],
  	[
  		43785,
  		43790
  	],
  	[
  		43793,
  		43798
  	],
  	[
  		43808,
  		43814
  	],
  	[
  		43816,
  		43822
  	],
  	[
  		43824,
  		43881
  	],
  	[
  		43888,
  		44002
  	],
  	[
  		44032,
  		55203
  	],
  	[
  		55216,
  		55238
  	],
  	[
  		55243,
  		55291
  	],
  	[
  		64256,
  		64262
  	],
  	[
  		64275,
  		64279
  	],
  	[
  		64336,
  		64433
  	],
  	[
  		64467,
  		64829
  	],
  	[
  		64848,
  		64911
  	],
  	[
  		64914,
  		64967
  	],
  	[
  		65008,
  		65019
  	],
  	[
  		65136,
  		65140
  	],
  	[
  		65142,
  		65276
  	],
  	[
  		65313,
  		65338
  	],
  	[
  		65345,
  		65370
  	],
  	[
  		65440,
  		65470
  	],
  	[
  		65474,
  		65479
  	],
  	[
  		65482,
  		65487
  	],
  	[
  		65490,
  		65495
  	],
  	[
  		65498,
  		65500
  	],
  	[
  		65536,
  		65547
  	],
  	[
  		65549,
  		65574
  	],
  	[
  		65576,
  		65594
  	],
  	[
  		65596,
  		65597
  	],
  	[
  		65599,
  		65613
  	],
  	[
  		65616,
  		65629
  	],
  	[
  		65664,
  		65786
  	],
  	[
  		65856,
  		65908
  	],
  	[
  		66176,
  		66204
  	],
  	[
  		66208,
  		66256
  	],
  	[
  		66304,
  		66335
  	],
  	[
  		66349,
  		66378
  	],
  	[
  		66384,
  		66421
  	],
  	[
  		66432,
  		66461
  	],
  	[
  		66464,
  		66499
  	],
  	[
  		66504,
  		66511
  	],
  	[
  		66513,
  		66517
  	],
  	[
  		66560,
  		66717
  	],
  	[
  		66736,
  		66771
  	],
  	[
  		66776,
  		66811
  	],
  	[
  		66816,
  		66855
  	],
  	[
  		66864,
  		66915
  	],
  	[
  		67072,
  		67382
  	],
  	[
  		67392,
  		67413
  	],
  	[
  		67424,
  		67431
  	],
  	[
  		67584,
  		67589
  	],
  	[
  		67592,
  		67592
  	],
  	[
  		67594,
  		67637
  	],
  	[
  		67639,
  		67640
  	],
  	[
  		67644,
  		67644
  	],
  	[
  		67647,
  		67669
  	],
  	[
  		67680,
  		67702
  	],
  	[
  		67712,
  		67742
  	],
  	[
  		67808,
  		67826
  	],
  	[
  		67828,
  		67829
  	],
  	[
  		67840,
  		67861
  	],
  	[
  		67872,
  		67897
  	],
  	[
  		67968,
  		68023
  	],
  	[
  		68030,
  		68031
  	],
  	[
  		68096,
  		68096
  	],
  	[
  		68112,
  		68115
  	],
  	[
  		68117,
  		68119
  	],
  	[
  		68121,
  		68149
  	],
  	[
  		68192,
  		68220
  	],
  	[
  		68224,
  		68252
  	],
  	[
  		68288,
  		68295
  	],
  	[
  		68297,
  		68324
  	],
  	[
  		68352,
  		68405
  	],
  	[
  		68416,
  		68437
  	],
  	[
  		68448,
  		68466
  	],
  	[
  		68480,
  		68497
  	],
  	[
  		68608,
  		68680
  	],
  	[
  		68736,
  		68786
  	],
  	[
  		68800,
  		68850
  	],
  	[
  		68864,
  		68899
  	],
  	[
  		69248,
  		69289
  	],
  	[
  		69296,
  		69297
  	],
  	[
  		69376,
  		69404
  	],
  	[
  		69415,
  		69415
  	],
  	[
  		69424,
  		69445
  	],
  	[
  		69552,
  		69572
  	],
  	[
  		69600,
  		69622
  	],
  	[
  		69635,
  		69687
  	],
  	[
  		69763,
  		69807
  	],
  	[
  		69840,
  		69864
  	],
  	[
  		69891,
  		69926
  	],
  	[
  		69956,
  		69956
  	],
  	[
  		69959,
  		69959
  	],
  	[
  		69968,
  		70002
  	],
  	[
  		70006,
  		70006
  	],
  	[
  		70019,
  		70066
  	],
  	[
  		70081,
  		70084
  	],
  	[
  		70106,
  		70106
  	],
  	[
  		70108,
  		70108
  	],
  	[
  		70144,
  		70161
  	],
  	[
  		70163,
  		70187
  	],
  	[
  		70272,
  		70278
  	],
  	[
  		70280,
  		70280
  	],
  	[
  		70282,
  		70285
  	],
  	[
  		70287,
  		70301
  	],
  	[
  		70303,
  		70312
  	],
  	[
  		70320,
  		70366
  	],
  	[
  		70405,
  		70412
  	],
  	[
  		70415,
  		70416
  	],
  	[
  		70419,
  		70440
  	],
  	[
  		70442,
  		70448
  	],
  	[
  		70450,
  		70451
  	],
  	[
  		70453,
  		70457
  	],
  	[
  		70461,
  		70461
  	],
  	[
  		70480,
  		70480
  	],
  	[
  		70493,
  		70497
  	],
  	[
  		70656,
  		70708
  	],
  	[
  		70727,
  		70730
  	],
  	[
  		70751,
  		70753
  	],
  	[
  		70784,
  		70831
  	],
  	[
  		70852,
  		70853
  	],
  	[
  		70855,
  		70855
  	],
  	[
  		71040,
  		71086
  	],
  	[
  		71128,
  		71131
  	],
  	[
  		71168,
  		71215
  	],
  	[
  		71236,
  		71236
  	],
  	[
  		71296,
  		71338
  	],
  	[
  		71352,
  		71352
  	],
  	[
  		71680,
  		71723
  	],
  	[
  		71840,
  		71903
  	],
  	[
  		71935,
  		71942
  	],
  	[
  		71945,
  		71945
  	],
  	[
  		71948,
  		71955
  	],
  	[
  		71957,
  		71958
  	],
  	[
  		71960,
  		71983
  	],
  	[
  		71999,
  		71999
  	],
  	[
  		72001,
  		72001
  	],
  	[
  		72096,
  		72103
  	],
  	[
  		72106,
  		72144
  	],
  	[
  		72161,
  		72161
  	],
  	[
  		72163,
  		72163
  	],
  	[
  		72192,
  		72192
  	],
  	[
  		72203,
  		72242
  	],
  	[
  		72250,
  		72250
  	],
  	[
  		72272,
  		72272
  	],
  	[
  		72284,
  		72329
  	],
  	[
  		72349,
  		72349
  	],
  	[
  		72384,
  		72440
  	],
  	[
  		72704,
  		72712
  	],
  	[
  		72714,
  		72750
  	],
  	[
  		72768,
  		72768
  	],
  	[
  		72818,
  		72847
  	],
  	[
  		72960,
  		72966
  	],
  	[
  		72968,
  		72969
  	],
  	[
  		72971,
  		73008
  	],
  	[
  		73030,
  		73030
  	],
  	[
  		73056,
  		73061
  	],
  	[
  		73063,
  		73064
  	],
  	[
  		73066,
  		73097
  	],
  	[
  		73112,
  		73112
  	],
  	[
  		73440,
  		73458
  	],
  	[
  		73648,
  		73648
  	],
  	[
  		73728,
  		74649
  	],
  	[
  		74752,
  		74862
  	],
  	[
  		74880,
  		75075
  	],
  	[
  		77824,
  		78894
  	],
  	[
  		82944,
  		83526
  	],
  	[
  		92160,
  		92728
  	],
  	[
  		92736,
  		92766
  	],
  	[
  		92880,
  		92909
  	],
  	[
  		92928,
  		92975
  	],
  	[
  		92992,
  		92995
  	],
  	[
  		93027,
  		93047
  	],
  	[
  		93053,
  		93071
  	],
  	[
  		93760,
  		93823
  	],
  	[
  		93952,
  		94026
  	],
  	[
  		94032,
  		94032
  	],
  	[
  		94099,
  		94111
  	],
  	[
  		94176,
  		94177
  	],
  	[
  		94179,
  		94179
  	],
  	[
  		113664,
  		113770
  	],
  	[
  		113776,
  		113788
  	],
  	[
  		113792,
  		113800
  	],
  	[
  		113808,
  		113817
  	],
  	[
  		119808,
  		119892
  	],
  	[
  		119894,
  		119964
  	],
  	[
  		119966,
  		119967
  	],
  	[
  		119970,
  		119970
  	],
  	[
  		119973,
  		119974
  	],
  	[
  		119977,
  		119980
  	],
  	[
  		119982,
  		119993
  	],
  	[
  		119995,
  		119995
  	],
  	[
  		119997,
  		120003
  	],
  	[
  		120005,
  		120069
  	],
  	[
  		120071,
  		120074
  	],
  	[
  		120077,
  		120084
  	],
  	[
  		120086,
  		120092
  	],
  	[
  		120094,
  		120121
  	],
  	[
  		120123,
  		120126
  	],
  	[
  		120128,
  		120132
  	],
  	[
  		120134,
  		120134
  	],
  	[
  		120138,
  		120144
  	],
  	[
  		120146,
  		120485
  	],
  	[
  		120488,
  		120512
  	],
  	[
  		120514,
  		120538
  	],
  	[
  		120540,
  		120570
  	],
  	[
  		120572,
  		120596
  	],
  	[
  		120598,
  		120628
  	],
  	[
  		120630,
  		120654
  	],
  	[
  		120656,
  		120686
  	],
  	[
  		120688,
  		120712
  	],
  	[
  		120714,
  		120744
  	],
  	[
  		120746,
  		120770
  	],
  	[
  		120772,
  		120779
  	],
  	[
  		123136,
  		123180
  	],
  	[
  		123191,
  		123197
  	],
  	[
  		123214,
  		123214
  	],
  	[
  		123584,
  		123627
  	],
  	[
  		124928,
  		125124
  	],
  	[
  		125184,
  		125251
  	],
  	[
  		125259,
  		125259
  	],
  	[
  		126464,
  		126467
  	],
  	[
  		126469,
  		126495
  	],
  	[
  		126497,
  		126498
  	],
  	[
  		126500,
  		126500
  	],
  	[
  		126503,
  		126503
  	],
  	[
  		126505,
  		126514
  	],
  	[
  		126516,
  		126519
  	],
  	[
  		126521,
  		126521
  	],
  	[
  		126523,
  		126523
  	],
  	[
  		126530,
  		126530
  	],
  	[
  		126535,
  		126535
  	],
  	[
  		126537,
  		126537
  	],
  	[
  		126539,
  		126539
  	],
  	[
  		126541,
  		126543
  	],
  	[
  		126545,
  		126546
  	],
  	[
  		126548,
  		126548
  	],
  	[
  		126551,
  		126551
  	],
  	[
  		126553,
  		126553
  	],
  	[
  		126555,
  		126555
  	],
  	[
  		126557,
  		126557
  	],
  	[
  		126559,
  		126559
  	],
  	[
  		126561,
  		126562
  	],
  	[
  		126564,
  		126564
  	],
  	[
  		126567,
  		126570
  	],
  	[
  		126572,
  		126578
  	],
  	[
  		126580,
  		126583
  	],
  	[
  		126585,
  		126588
  	],
  	[
  		126590,
  		126590
  	],
  	[
  		126592,
  		126601
  	],
  	[
  		126603,
  		126619
  	],
  	[
  		126625,
  		126627
  	],
  	[
  		126629,
  		126633
  	],
  	[
  		126635,
  		126651
  	],
  	[
  		127280,
  		127305
  	],
  	[
  		127312,
  		127337
  	],
  	[
  		127344,
  		127369
  	]
  ],
  	"Word_Break/Single_Quote": [
  	[
  		39,
  		39
  	]
  ],
  	"Word_Break/ExtendNumLet": [
  	[
  		95,
  		95
  	],
  	[
  		8239,
  		8239
  	],
  	[
  		8255,
  		8256
  	],
  	[
  		8276,
  		8276
  	],
  	[
  		65075,
  		65076
  	],
  	[
  		65101,
  		65103
  	],
  	[
  		65343,
  		65343
  	]
  ],
  	"Word_Break/Newline": [
  	[
  		11,
  		12
  	],
  	[
  		133,
  		133
  	],
  	[
  		8232,
  		8233
  	]
  ],
  	"Line_Break/H2": [
  	[
  		44032,
  		44032
  	],
  	[
  		44060,
  		44060
  	],
  	[
  		44088,
  		44088
  	],
  	[
  		44116,
  		44116
  	],
  	[
  		44144,
  		44144
  	],
  	[
  		44172,
  		44172
  	],
  	[
  		44200,
  		44200
  	],
  	[
  		44228,
  		44228
  	],
  	[
  		44256,
  		44256
  	],
  	[
  		44284,
  		44284
  	],
  	[
  		44312,
  		44312
  	],
  	[
  		44340,
  		44340
  	],
  	[
  		44368,
  		44368
  	],
  	[
  		44396,
  		44396
  	],
  	[
  		44424,
  		44424
  	],
  	[
  		44452,
  		44452
  	],
  	[
  		44480,
  		44480
  	],
  	[
  		44508,
  		44508
  	],
  	[
  		44536,
  		44536
  	],
  	[
  		44564,
  		44564
  	],
  	[
  		44592,
  		44592
  	],
  	[
  		44620,
  		44620
  	],
  	[
  		44648,
  		44648
  	],
  	[
  		44676,
  		44676
  	],
  	[
  		44704,
  		44704
  	],
  	[
  		44732,
  		44732
  	],
  	[
  		44760,
  		44760
  	],
  	[
  		44788,
  		44788
  	],
  	[
  		44816,
  		44816
  	],
  	[
  		44844,
  		44844
  	],
  	[
  		44872,
  		44872
  	],
  	[
  		44900,
  		44900
  	],
  	[
  		44928,
  		44928
  	],
  	[
  		44956,
  		44956
  	],
  	[
  		44984,
  		44984
  	],
  	[
  		45012,
  		45012
  	],
  	[
  		45040,
  		45040
  	],
  	[
  		45068,
  		45068
  	],
  	[
  		45096,
  		45096
  	],
  	[
  		45124,
  		45124
  	],
  	[
  		45152,
  		45152
  	],
  	[
  		45180,
  		45180
  	],
  	[
  		45208,
  		45208
  	],
  	[
  		45236,
  		45236
  	],
  	[
  		45264,
  		45264
  	],
  	[
  		45292,
  		45292
  	],
  	[
  		45320,
  		45320
  	],
  	[
  		45348,
  		45348
  	],
  	[
  		45376,
  		45376
  	],
  	[
  		45404,
  		45404
  	],
  	[
  		45432,
  		45432
  	],
  	[
  		45460,
  		45460
  	],
  	[
  		45488,
  		45488
  	],
  	[
  		45516,
  		45516
  	],
  	[
  		45544,
  		45544
  	],
  	[
  		45572,
  		45572
  	],
  	[
  		45600,
  		45600
  	],
  	[
  		45628,
  		45628
  	],
  	[
  		45656,
  		45656
  	],
  	[
  		45684,
  		45684
  	],
  	[
  		45712,
  		45712
  	],
  	[
  		45740,
  		45740
  	],
  	[
  		45768,
  		45768
  	],
  	[
  		45796,
  		45796
  	],
  	[
  		45824,
  		45824
  	],
  	[
  		45852,
  		45852
  	],
  	[
  		45880,
  		45880
  	],
  	[
  		45908,
  		45908
  	],
  	[
  		45936,
  		45936
  	],
  	[
  		45964,
  		45964
  	],
  	[
  		45992,
  		45992
  	],
  	[
  		46020,
  		46020
  	],
  	[
  		46048,
  		46048
  	],
  	[
  		46076,
  		46076
  	],
  	[
  		46104,
  		46104
  	],
  	[
  		46132,
  		46132
  	],
  	[
  		46160,
  		46160
  	],
  	[
  		46188,
  		46188
  	],
  	[
  		46216,
  		46216
  	],
  	[
  		46244,
  		46244
  	],
  	[
  		46272,
  		46272
  	],
  	[
  		46300,
  		46300
  	],
  	[
  		46328,
  		46328
  	],
  	[
  		46356,
  		46356
  	],
  	[
  		46384,
  		46384
  	],
  	[
  		46412,
  		46412
  	],
  	[
  		46440,
  		46440
  	],
  	[
  		46468,
  		46468
  	],
  	[
  		46496,
  		46496
  	],
  	[
  		46524,
  		46524
  	],
  	[
  		46552,
  		46552
  	],
  	[
  		46580,
  		46580
  	],
  	[
  		46608,
  		46608
  	],
  	[
  		46636,
  		46636
  	],
  	[
  		46664,
  		46664
  	],
  	[
  		46692,
  		46692
  	],
  	[
  		46720,
  		46720
  	],
  	[
  		46748,
  		46748
  	],
  	[
  		46776,
  		46776
  	],
  	[
  		46804,
  		46804
  	],
  	[
  		46832,
  		46832
  	],
  	[
  		46860,
  		46860
  	],
  	[
  		46888,
  		46888
  	],
  	[
  		46916,
  		46916
  	],
  	[
  		46944,
  		46944
  	],
  	[
  		46972,
  		46972
  	],
  	[
  		47000,
  		47000
  	],
  	[
  		47028,
  		47028
  	],
  	[
  		47056,
  		47056
  	],
  	[
  		47084,
  		47084
  	],
  	[
  		47112,
  		47112
  	],
  	[
  		47140,
  		47140
  	],
  	[
  		47168,
  		47168
  	],
  	[
  		47196,
  		47196
  	],
  	[
  		47224,
  		47224
  	],
  	[
  		47252,
  		47252
  	],
  	[
  		47280,
  		47280
  	],
  	[
  		47308,
  		47308
  	],
  	[
  		47336,
  		47336
  	],
  	[
  		47364,
  		47364
  	],
  	[
  		47392,
  		47392
  	],
  	[
  		47420,
  		47420
  	],
  	[
  		47448,
  		47448
  	],
  	[
  		47476,
  		47476
  	],
  	[
  		47504,
  		47504
  	],
  	[
  		47532,
  		47532
  	],
  	[
  		47560,
  		47560
  	],
  	[
  		47588,
  		47588
  	],
  	[
  		47616,
  		47616
  	],
  	[
  		47644,
  		47644
  	],
  	[
  		47672,
  		47672
  	],
  	[
  		47700,
  		47700
  	],
  	[
  		47728,
  		47728
  	],
  	[
  		47756,
  		47756
  	],
  	[
  		47784,
  		47784
  	],
  	[
  		47812,
  		47812
  	],
  	[
  		47840,
  		47840
  	],
  	[
  		47868,
  		47868
  	],
  	[
  		47896,
  		47896
  	],
  	[
  		47924,
  		47924
  	],
  	[
  		47952,
  		47952
  	],
  	[
  		47980,
  		47980
  	],
  	[
  		48008,
  		48008
  	],
  	[
  		48036,
  		48036
  	],
  	[
  		48064,
  		48064
  	],
  	[
  		48092,
  		48092
  	],
  	[
  		48120,
  		48120
  	],
  	[
  		48148,
  		48148
  	],
  	[
  		48176,
  		48176
  	],
  	[
  		48204,
  		48204
  	],
  	[
  		48232,
  		48232
  	],
  	[
  		48260,
  		48260
  	],
  	[
  		48288,
  		48288
  	],
  	[
  		48316,
  		48316
  	],
  	[
  		48344,
  		48344
  	],
  	[
  		48372,
  		48372
  	],
  	[
  		48400,
  		48400
  	],
  	[
  		48428,
  		48428
  	],
  	[
  		48456,
  		48456
  	],
  	[
  		48484,
  		48484
  	],
  	[
  		48512,
  		48512
  	],
  	[
  		48540,
  		48540
  	],
  	[
  		48568,
  		48568
  	],
  	[
  		48596,
  		48596
  	],
  	[
  		48624,
  		48624
  	],
  	[
  		48652,
  		48652
  	],
  	[
  		48680,
  		48680
  	],
  	[
  		48708,
  		48708
  	],
  	[
  		48736,
  		48736
  	],
  	[
  		48764,
  		48764
  	],
  	[
  		48792,
  		48792
  	],
  	[
  		48820,
  		48820
  	],
  	[
  		48848,
  		48848
  	],
  	[
  		48876,
  		48876
  	],
  	[
  		48904,
  		48904
  	],
  	[
  		48932,
  		48932
  	],
  	[
  		48960,
  		48960
  	],
  	[
  		48988,
  		48988
  	],
  	[
  		49016,
  		49016
  	],
  	[
  		49044,
  		49044
  	],
  	[
  		49072,
  		49072
  	],
  	[
  		49100,
  		49100
  	],
  	[
  		49128,
  		49128
  	],
  	[
  		49156,
  		49156
  	],
  	[
  		49184,
  		49184
  	],
  	[
  		49212,
  		49212
  	],
  	[
  		49240,
  		49240
  	],
  	[
  		49268,
  		49268
  	],
  	[
  		49296,
  		49296
  	],
  	[
  		49324,
  		49324
  	],
  	[
  		49352,
  		49352
  	],
  	[
  		49380,
  		49380
  	],
  	[
  		49408,
  		49408
  	],
  	[
  		49436,
  		49436
  	],
  	[
  		49464,
  		49464
  	],
  	[
  		49492,
  		49492
  	],
  	[
  		49520,
  		49520
  	],
  	[
  		49548,
  		49548
  	],
  	[
  		49576,
  		49576
  	],
  	[
  		49604,
  		49604
  	],
  	[
  		49632,
  		49632
  	],
  	[
  		49660,
  		49660
  	],
  	[
  		49688,
  		49688
  	],
  	[
  		49716,
  		49716
  	],
  	[
  		49744,
  		49744
  	],
  	[
  		49772,
  		49772
  	],
  	[
  		49800,
  		49800
  	],
  	[
  		49828,
  		49828
  	],
  	[
  		49856,
  		49856
  	],
  	[
  		49884,
  		49884
  	],
  	[
  		49912,
  		49912
  	],
  	[
  		49940,
  		49940
  	],
  	[
  		49968,
  		49968
  	],
  	[
  		49996,
  		49996
  	],
  	[
  		50024,
  		50024
  	],
  	[
  		50052,
  		50052
  	],
  	[
  		50080,
  		50080
  	],
  	[
  		50108,
  		50108
  	],
  	[
  		50136,
  		50136
  	],
  	[
  		50164,
  		50164
  	],
  	[
  		50192,
  		50192
  	],
  	[
  		50220,
  		50220
  	],
  	[
  		50248,
  		50248
  	],
  	[
  		50276,
  		50276
  	],
  	[
  		50304,
  		50304
  	],
  	[
  		50332,
  		50332
  	],
  	[
  		50360,
  		50360
  	],
  	[
  		50388,
  		50388
  	],
  	[
  		50416,
  		50416
  	],
  	[
  		50444,
  		50444
  	],
  	[
  		50472,
  		50472
  	],
  	[
  		50500,
  		50500
  	],
  	[
  		50528,
  		50528
  	],
  	[
  		50556,
  		50556
  	],
  	[
  		50584,
  		50584
  	],
  	[
  		50612,
  		50612
  	],
  	[
  		50640,
  		50640
  	],
  	[
  		50668,
  		50668
  	],
  	[
  		50696,
  		50696
  	],
  	[
  		50724,
  		50724
  	],
  	[
  		50752,
  		50752
  	],
  	[
  		50780,
  		50780
  	],
  	[
  		50808,
  		50808
  	],
  	[
  		50836,
  		50836
  	],
  	[
  		50864,
  		50864
  	],
  	[
  		50892,
  		50892
  	],
  	[
  		50920,
  		50920
  	],
  	[
  		50948,
  		50948
  	],
  	[
  		50976,
  		50976
  	],
  	[
  		51004,
  		51004
  	],
  	[
  		51032,
  		51032
  	],
  	[
  		51060,
  		51060
  	],
  	[
  		51088,
  		51088
  	],
  	[
  		51116,
  		51116
  	],
  	[
  		51144,
  		51144
  	],
  	[
  		51172,
  		51172
  	],
  	[
  		51200,
  		51200
  	],
  	[
  		51228,
  		51228
  	],
  	[
  		51256,
  		51256
  	],
  	[
  		51284,
  		51284
  	],
  	[
  		51312,
  		51312
  	],
  	[
  		51340,
  		51340
  	],
  	[
  		51368,
  		51368
  	],
  	[
  		51396,
  		51396
  	],
  	[
  		51424,
  		51424
  	],
  	[
  		51452,
  		51452
  	],
  	[
  		51480,
  		51480
  	],
  	[
  		51508,
  		51508
  	],
  	[
  		51536,
  		51536
  	],
  	[
  		51564,
  		51564
  	],
  	[
  		51592,
  		51592
  	],
  	[
  		51620,
  		51620
  	],
  	[
  		51648,
  		51648
  	],
  	[
  		51676,
  		51676
  	],
  	[
  		51704,
  		51704
  	],
  	[
  		51732,
  		51732
  	],
  	[
  		51760,
  		51760
  	],
  	[
  		51788,
  		51788
  	],
  	[
  		51816,
  		51816
  	],
  	[
  		51844,
  		51844
  	],
  	[
  		51872,
  		51872
  	],
  	[
  		51900,
  		51900
  	],
  	[
  		51928,
  		51928
  	],
  	[
  		51956,
  		51956
  	],
  	[
  		51984,
  		51984
  	],
  	[
  		52012,
  		52012
  	],
  	[
  		52040,
  		52040
  	],
  	[
  		52068,
  		52068
  	],
  	[
  		52096,
  		52096
  	],
  	[
  		52124,
  		52124
  	],
  	[
  		52152,
  		52152
  	],
  	[
  		52180,
  		52180
  	],
  	[
  		52208,
  		52208
  	],
  	[
  		52236,
  		52236
  	],
  	[
  		52264,
  		52264
  	],
  	[
  		52292,
  		52292
  	],
  	[
  		52320,
  		52320
  	],
  	[
  		52348,
  		52348
  	],
  	[
  		52376,
  		52376
  	],
  	[
  		52404,
  		52404
  	],
  	[
  		52432,
  		52432
  	],
  	[
  		52460,
  		52460
  	],
  	[
  		52488,
  		52488
  	],
  	[
  		52516,
  		52516
  	],
  	[
  		52544,
  		52544
  	],
  	[
  		52572,
  		52572
  	],
  	[
  		52600,
  		52600
  	],
  	[
  		52628,
  		52628
  	],
  	[
  		52656,
  		52656
  	],
  	[
  		52684,
  		52684
  	],
  	[
  		52712,
  		52712
  	],
  	[
  		52740,
  		52740
  	],
  	[
  		52768,
  		52768
  	],
  	[
  		52796,
  		52796
  	],
  	[
  		52824,
  		52824
  	],
  	[
  		52852,
  		52852
  	],
  	[
  		52880,
  		52880
  	],
  	[
  		52908,
  		52908
  	],
  	[
  		52936,
  		52936
  	],
  	[
  		52964,
  		52964
  	],
  	[
  		52992,
  		52992
  	],
  	[
  		53020,
  		53020
  	],
  	[
  		53048,
  		53048
  	],
  	[
  		53076,
  		53076
  	],
  	[
  		53104,
  		53104
  	],
  	[
  		53132,
  		53132
  	],
  	[
  		53160,
  		53160
  	],
  	[
  		53188,
  		53188
  	],
  	[
  		53216,
  		53216
  	],
  	[
  		53244,
  		53244
  	],
  	[
  		53272,
  		53272
  	],
  	[
  		53300,
  		53300
  	],
  	[
  		53328,
  		53328
  	],
  	[
  		53356,
  		53356
  	],
  	[
  		53384,
  		53384
  	],
  	[
  		53412,
  		53412
  	],
  	[
  		53440,
  		53440
  	],
  	[
  		53468,
  		53468
  	],
  	[
  		53496,
  		53496
  	],
  	[
  		53524,
  		53524
  	],
  	[
  		53552,
  		53552
  	],
  	[
  		53580,
  		53580
  	],
  	[
  		53608,
  		53608
  	],
  	[
  		53636,
  		53636
  	],
  	[
  		53664,
  		53664
  	],
  	[
  		53692,
  		53692
  	],
  	[
  		53720,
  		53720
  	],
  	[
  		53748,
  		53748
  	],
  	[
  		53776,
  		53776
  	],
  	[
  		53804,
  		53804
  	],
  	[
  		53832,
  		53832
  	],
  	[
  		53860,
  		53860
  	],
  	[
  		53888,
  		53888
  	],
  	[
  		53916,
  		53916
  	],
  	[
  		53944,
  		53944
  	],
  	[
  		53972,
  		53972
  	],
  	[
  		54000,
  		54000
  	],
  	[
  		54028,
  		54028
  	],
  	[
  		54056,
  		54056
  	],
  	[
  		54084,
  		54084
  	],
  	[
  		54112,
  		54112
  	],
  	[
  		54140,
  		54140
  	],
  	[
  		54168,
  		54168
  	],
  	[
  		54196,
  		54196
  	],
  	[
  		54224,
  		54224
  	],
  	[
  		54252,
  		54252
  	],
  	[
  		54280,
  		54280
  	],
  	[
  		54308,
  		54308
  	],
  	[
  		54336,
  		54336
  	],
  	[
  		54364,
  		54364
  	],
  	[
  		54392,
  		54392
  	],
  	[
  		54420,
  		54420
  	],
  	[
  		54448,
  		54448
  	],
  	[
  		54476,
  		54476
  	],
  	[
  		54504,
  		54504
  	],
  	[
  		54532,
  		54532
  	],
  	[
  		54560,
  		54560
  	],
  	[
  		54588,
  		54588
  	],
  	[
  		54616,
  		54616
  	],
  	[
  		54644,
  		54644
  	],
  	[
  		54672,
  		54672
  	],
  	[
  		54700,
  		54700
  	],
  	[
  		54728,
  		54728
  	],
  	[
  		54756,
  		54756
  	],
  	[
  		54784,
  		54784
  	],
  	[
  		54812,
  		54812
  	],
  	[
  		54840,
  		54840
  	],
  	[
  		54868,
  		54868
  	],
  	[
  		54896,
  		54896
  	],
  	[
  		54924,
  		54924
  	],
  	[
  		54952,
  		54952
  	],
  	[
  		54980,
  		54980
  	],
  	[
  		55008,
  		55008
  	],
  	[
  		55036,
  		55036
  	],
  	[
  		55064,
  		55064
  	],
  	[
  		55092,
  		55092
  	],
  	[
  		55120,
  		55120
  	],
  	[
  		55148,
  		55148
  	],
  	[
  		55176,
  		55176
  	]
  ],
  	"Line_Break/Numeric": [
  	[
  		48,
  		57
  	],
  	[
  		1632,
  		1641
  	],
  	[
  		1643,
  		1644
  	],
  	[
  		1776,
  		1785
  	],
  	[
  		1984,
  		1993
  	],
  	[
  		2406,
  		2415
  	],
  	[
  		2534,
  		2543
  	],
  	[
  		2662,
  		2671
  	],
  	[
  		2790,
  		2799
  	],
  	[
  		2918,
  		2927
  	],
  	[
  		3046,
  		3055
  	],
  	[
  		3174,
  		3183
  	],
  	[
  		3302,
  		3311
  	],
  	[
  		3430,
  		3439
  	],
  	[
  		3558,
  		3567
  	],
  	[
  		3664,
  		3673
  	],
  	[
  		3792,
  		3801
  	],
  	[
  		3872,
  		3881
  	],
  	[
  		4160,
  		4169
  	],
  	[
  		4240,
  		4249
  	],
  	[
  		6112,
  		6121
  	],
  	[
  		6160,
  		6169
  	],
  	[
  		6470,
  		6479
  	],
  	[
  		6608,
  		6617
  	],
  	[
  		6784,
  		6793
  	],
  	[
  		6800,
  		6809
  	],
  	[
  		6992,
  		7001
  	],
  	[
  		7088,
  		7097
  	],
  	[
  		7232,
  		7241
  	],
  	[
  		7248,
  		7257
  	],
  	[
  		42528,
  		42537
  	],
  	[
  		43216,
  		43225
  	],
  	[
  		43264,
  		43273
  	],
  	[
  		43472,
  		43481
  	],
  	[
  		43504,
  		43513
  	],
  	[
  		43600,
  		43609
  	],
  	[
  		44016,
  		44025
  	],
  	[
  		66720,
  		66729
  	],
  	[
  		68912,
  		68921
  	],
  	[
  		69734,
  		69743
  	],
  	[
  		69872,
  		69881
  	],
  	[
  		69942,
  		69951
  	],
  	[
  		70096,
  		70105
  	],
  	[
  		70384,
  		70393
  	],
  	[
  		70736,
  		70745
  	],
  	[
  		70864,
  		70873
  	],
  	[
  		71248,
  		71257
  	],
  	[
  		71360,
  		71369
  	],
  	[
  		71472,
  		71481
  	],
  	[
  		71904,
  		71913
  	],
  	[
  		72016,
  		72025
  	],
  	[
  		72784,
  		72793
  	],
  	[
  		73040,
  		73049
  	],
  	[
  		73120,
  		73129
  	],
  	[
  		92768,
  		92777
  	],
  	[
  		93008,
  		93017
  	],
  	[
  		120782,
  		120831
  	],
  	[
  		123200,
  		123209
  	],
  	[
  		123632,
  		123641
  	],
  	[
  		125264,
  		125273
  	],
  	[
  		130032,
  		130041
  	]
  ],
  	"Line_Break/JT": [
  	[
  		4520,
  		4607
  	],
  	[
  		55243,
  		55291
  	]
  ],
  	"Line_Break/Regional_Indicator": [
  	[
  		127462,
  		127487
  	]
  ],
  	"Line_Break/Next_Line": [
  	[
  		133,
  		133
  	]
  ],
  	"Line_Break/Hebrew_Letter": [
  	[
  		1488,
  		1514
  	],
  	[
  		1519,
  		1522
  	],
  	[
  		64285,
  		64285
  	],
  	[
  		64287,
  		64296
  	],
  	[
  		64298,
  		64310
  	],
  	[
  		64312,
  		64316
  	],
  	[
  		64318,
  		64318
  	],
  	[
  		64320,
  		64321
  	],
  	[
  		64323,
  		64324
  	],
  	[
  		64326,
  		64335
  	]
  ],
  	"Line_Break/Ideographic": [
  	[
  		8986,
  		8987
  	],
  	[
  		9200,
  		9203
  	],
  	[
  		9728,
  		9731
  	],
  	[
  		9748,
  		9749
  	],
  	[
  		9752,
  		9752
  	],
  	[
  		9754,
  		9756
  	],
  	[
  		9758,
  		9759
  	],
  	[
  		9785,
  		9787
  	],
  	[
  		9832,
  		9832
  	],
  	[
  		9855,
  		9855
  	],
  	[
  		9917,
  		9928
  	],
  	[
  		9933,
  		9933
  	],
  	[
  		9935,
  		9937
  	],
  	[
  		9939,
  		9940
  	],
  	[
  		9944,
  		9945
  	],
  	[
  		9948,
  		9948
  	],
  	[
  		9951,
  		9953
  	],
  	[
  		9962,
  		9962
  	],
  	[
  		9969,
  		9973
  	],
  	[
  		9975,
  		9976
  	],
  	[
  		9978,
  		9978
  	],
  	[
  		9981,
  		9988
  	],
  	[
  		9992,
  		9993
  	],
  	[
  		10084,
  		10084
  	],
  	[
  		11904,
  		11929
  	],
  	[
  		11931,
  		12019
  	],
  	[
  		12032,
  		12245
  	],
  	[
  		12272,
  		12283
  	],
  	[
  		12291,
  		12292
  	],
  	[
  		12294,
  		12295
  	],
  	[
  		12306,
  		12307
  	],
  	[
  		12320,
  		12329
  	],
  	[
  		12336,
  		12340
  	],
  	[
  		12342,
  		12346
  	],
  	[
  		12349,
  		12351
  	],
  	[
  		12354,
  		12354
  	],
  	[
  		12356,
  		12356
  	],
  	[
  		12358,
  		12358
  	],
  	[
  		12360,
  		12360
  	],
  	[
  		12362,
  		12386
  	],
  	[
  		12388,
  		12418
  	],
  	[
  		12420,
  		12420
  	],
  	[
  		12422,
  		12422
  	],
  	[
  		12424,
  		12429
  	],
  	[
  		12431,
  		12436
  	],
  	[
  		12447,
  		12447
  	],
  	[
  		12450,
  		12450
  	],
  	[
  		12452,
  		12452
  	],
  	[
  		12454,
  		12454
  	],
  	[
  		12456,
  		12456
  	],
  	[
  		12458,
  		12482
  	],
  	[
  		12484,
  		12514
  	],
  	[
  		12516,
  		12516
  	],
  	[
  		12518,
  		12518
  	],
  	[
  		12520,
  		12525
  	],
  	[
  		12527,
  		12532
  	],
  	[
  		12535,
  		12538
  	],
  	[
  		12543,
  		12543
  	],
  	[
  		12549,
  		12591
  	],
  	[
  		12593,
  		12686
  	],
  	[
  		12688,
  		12771
  	],
  	[
  		12800,
  		12830
  	],
  	[
  		12832,
  		12871
  	],
  	[
  		12880,
  		19903
  	],
  	[
  		19968,
  		40980
  	],
  	[
  		40982,
  		42124
  	],
  	[
  		42128,
  		42182
  	],
  	[
  		63744,
  		64255
  	],
  	[
  		65072,
  		65076
  	],
  	[
  		65093,
  		65094
  	],
  	[
  		65097,
  		65103
  	],
  	[
  		65105,
  		65105
  	],
  	[
  		65112,
  		65112
  	],
  	[
  		65119,
  		65126
  	],
  	[
  		65128,
  		65128
  	],
  	[
  		65131,
  		65131
  	],
  	[
  		65282,
  		65283
  	],
  	[
  		65286,
  		65287
  	],
  	[
  		65290,
  		65291
  	],
  	[
  		65293,
  		65293
  	],
  	[
  		65295,
  		65305
  	],
  	[
  		65308,
  		65310
  	],
  	[
  		65312,
  		65338
  	],
  	[
  		65340,
  		65340
  	],
  	[
  		65342,
  		65370
  	],
  	[
  		65372,
  		65372
  	],
  	[
  		65374,
  		65374
  	],
  	[
  		65382,
  		65382
  	],
  	[
  		65393,
  		65437
  	],
  	[
  		65440,
  		65470
  	],
  	[
  		65474,
  		65479
  	],
  	[
  		65482,
  		65487
  	],
  	[
  		65490,
  		65495
  	],
  	[
  		65498,
  		65500
  	],
  	[
  		65506,
  		65508
  	],
  	[
  		94208,
  		100343
  	],
  	[
  		100352,
  		101119
  	],
  	[
  		101632,
  		101640
  	],
  	[
  		110592,
  		110878
  	],
  	[
  		110960,
  		111355
  	],
  	[
  		126976,
  		127231
  	],
  	[
  		127245,
  		127247
  	],
  	[
  		127341,
  		127343
  	],
  	[
  		127405,
  		127461
  	],
  	[
  		127488,
  		127876
  	],
  	[
  		127878,
  		127899
  	],
  	[
  		127902,
  		127924
  	],
  	[
  		127927,
  		127931
  	],
  	[
  		127933,
  		127937
  	],
  	[
  		127941,
  		127942
  	],
  	[
  		127944,
  		127945
  	],
  	[
  		127949,
  		127994
  	],
  	[
  		128000,
  		128065
  	],
  	[
  		128068,
  		128069
  	],
  	[
  		128081,
  		128101
  	],
  	[
  		128121,
  		128123
  	],
  	[
  		128125,
  		128128
  	],
  	[
  		128132,
  		128132
  	],
  	[
  		128136,
  		128142
  	],
  	[
  		128144,
  		128144
  	],
  	[
  		128146,
  		128159
  	],
  	[
  		128161,
  		128161
  	],
  	[
  		128163,
  		128163
  	],
  	[
  		128165,
  		128169
  	],
  	[
  		128171,
  		128174
  	],
  	[
  		128176,
  		128176
  	],
  	[
  		128179,
  		128255
  	],
  	[
  		128263,
  		128278
  	],
  	[
  		128293,
  		128305
  	],
  	[
  		128330,
  		128371
  	],
  	[
  		128374,
  		128377
  	],
  	[
  		128379,
  		128399
  	],
  	[
  		128401,
  		128404
  	],
  	[
  		128407,
  		128467
  	],
  	[
  		128476,
  		128499
  	],
  	[
  		128506,
  		128580
  	],
  	[
  		128584,
  		128586
  	],
  	[
  		128640,
  		128674
  	],
  	[
  		128676,
  		128691
  	],
  	[
  		128695,
  		128703
  	],
  	[
  		128705,
  		128715
  	],
  	[
  		128717,
  		128767
  	],
  	[
  		128884,
  		128895
  	],
  	[
  		128981,
  		129023
  	],
  	[
  		129036,
  		129039
  	],
  	[
  		129096,
  		129103
  	],
  	[
  		129114,
  		129119
  	],
  	[
  		129160,
  		129167
  	],
  	[
  		129198,
  		129279
  	],
  	[
  		129293,
  		129294
  	],
  	[
  		129296,
  		129303
  	],
  	[
  		129312,
  		129317
  	],
  	[
  		129319,
  		129327
  	],
  	[
  		129338,
  		129339
  	],
  	[
  		129343,
  		129398
  	],
  	[
  		129400,
  		129460
  	],
  	[
  		129463,
  		129463
  	],
  	[
  		129466,
  		129466
  	],
  	[
  		129468,
  		129484
  	],
  	[
  		129488,
  		129488
  	],
  	[
  		129502,
  		129535
  	],
  	[
  		129620,
  		129791
  	],
  	[
  		130048,
  		131069
  	],
  	[
  		131072,
  		196605
  	],
  	[
  		196608,
  		262141
  	]
  ],
  	"Line_Break/ZWJ": [
  	[
  		8205,
  		8205
  	]
  ],
  	"Line_Break/Close_Parenthesis": [
  	[
  		41,
  		41
  	],
  	[
  		93,
  		93
  	]
  ],
  	"Line_Break/Space": [
  	[
  		32,
  		32
  	]
  ],
  	"Line_Break/JV": [
  	[
  		4448,
  		4519
  	],
  	[
  		55216,
  		55238
  	]
  ],
  	"Line_Break/Prefix_Numeric": [
  	[
  		36,
  		36
  	],
  	[
  		43,
  		43
  	],
  	[
  		92,
  		92
  	],
  	[
  		163,
  		165
  	],
  	[
  		177,
  		177
  	],
  	[
  		1423,
  		1423
  	],
  	[
  		2046,
  		2047
  	],
  	[
  		2555,
  		2555
  	],
  	[
  		2801,
  		2801
  	],
  	[
  		3065,
  		3065
  	],
  	[
  		3647,
  		3647
  	],
  	[
  		6107,
  		6107
  	],
  	[
  		8352,
  		8358
  	],
  	[
  		8360,
  		8373
  	],
  	[
  		8375,
  		8378
  	],
  	[
  		8380,
  		8381
  	],
  	[
  		8383,
  		8399
  	],
  	[
  		8470,
  		8470
  	],
  	[
  		8722,
  		8723
  	],
  	[
  		65129,
  		65129
  	],
  	[
  		65284,
  		65284
  	],
  	[
  		65505,
  		65505
  	],
  	[
  		65509,
  		65510
  	],
  	[
  		123647,
  		123647
  	]
  ],
  	"Line_Break/JL": [
  	[
  		4352,
  		4447
  	],
  	[
  		43360,
  		43388
  	]
  ],
  	"Line_Break/Word_Joiner": [
  	[
  		8288,
  		8288
  	],
  	[
  		65279,
  		65279
  	]
  ],
  	"Line_Break/ZWSpace": [
  	[
  		8203,
  		8203
  	]
  ],
  	"Line_Break/Glue": [
  	[
  		160,
  		160
  	],
  	[
  		847,
  		847
  	],
  	[
  		860,
  		866
  	],
  	[
  		3848,
  		3848
  	],
  	[
  		3852,
  		3852
  	],
  	[
  		3858,
  		3858
  	],
  	[
  		4057,
  		4058
  	],
  	[
  		6158,
  		6158
  	],
  	[
  		8199,
  		8199
  	],
  	[
  		8209,
  		8209
  	],
  	[
  		8239,
  		8239
  	],
  	[
  		78896,
  		78902
  	],
  	[
  		94180,
  		94180
  	]
  ],
  	"Line_Break/H3": [
  	[
  		44033,
  		44059
  	],
  	[
  		44061,
  		44087
  	],
  	[
  		44089,
  		44115
  	],
  	[
  		44117,
  		44143
  	],
  	[
  		44145,
  		44171
  	],
  	[
  		44173,
  		44199
  	],
  	[
  		44201,
  		44227
  	],
  	[
  		44229,
  		44255
  	],
  	[
  		44257,
  		44283
  	],
  	[
  		44285,
  		44311
  	],
  	[
  		44313,
  		44339
  	],
  	[
  		44341,
  		44367
  	],
  	[
  		44369,
  		44395
  	],
  	[
  		44397,
  		44423
  	],
  	[
  		44425,
  		44451
  	],
  	[
  		44453,
  		44479
  	],
  	[
  		44481,
  		44507
  	],
  	[
  		44509,
  		44535
  	],
  	[
  		44537,
  		44563
  	],
  	[
  		44565,
  		44591
  	],
  	[
  		44593,
  		44619
  	],
  	[
  		44621,
  		44647
  	],
  	[
  		44649,
  		44675
  	],
  	[
  		44677,
  		44703
  	],
  	[
  		44705,
  		44731
  	],
  	[
  		44733,
  		44759
  	],
  	[
  		44761,
  		44787
  	],
  	[
  		44789,
  		44815
  	],
  	[
  		44817,
  		44843
  	],
  	[
  		44845,
  		44871
  	],
  	[
  		44873,
  		44899
  	],
  	[
  		44901,
  		44927
  	],
  	[
  		44929,
  		44955
  	],
  	[
  		44957,
  		44983
  	],
  	[
  		44985,
  		45011
  	],
  	[
  		45013,
  		45039
  	],
  	[
  		45041,
  		45067
  	],
  	[
  		45069,
  		45095
  	],
  	[
  		45097,
  		45123
  	],
  	[
  		45125,
  		45151
  	],
  	[
  		45153,
  		45179
  	],
  	[
  		45181,
  		45207
  	],
  	[
  		45209,
  		45235
  	],
  	[
  		45237,
  		45263
  	],
  	[
  		45265,
  		45291
  	],
  	[
  		45293,
  		45319
  	],
  	[
  		45321,
  		45347
  	],
  	[
  		45349,
  		45375
  	],
  	[
  		45377,
  		45403
  	],
  	[
  		45405,
  		45431
  	],
  	[
  		45433,
  		45459
  	],
  	[
  		45461,
  		45487
  	],
  	[
  		45489,
  		45515
  	],
  	[
  		45517,
  		45543
  	],
  	[
  		45545,
  		45571
  	],
  	[
  		45573,
  		45599
  	],
  	[
  		45601,
  		45627
  	],
  	[
  		45629,
  		45655
  	],
  	[
  		45657,
  		45683
  	],
  	[
  		45685,
  		45711
  	],
  	[
  		45713,
  		45739
  	],
  	[
  		45741,
  		45767
  	],
  	[
  		45769,
  		45795
  	],
  	[
  		45797,
  		45823
  	],
  	[
  		45825,
  		45851
  	],
  	[
  		45853,
  		45879
  	],
  	[
  		45881,
  		45907
  	],
  	[
  		45909,
  		45935
  	],
  	[
  		45937,
  		45963
  	],
  	[
  		45965,
  		45991
  	],
  	[
  		45993,
  		46019
  	],
  	[
  		46021,
  		46047
  	],
  	[
  		46049,
  		46075
  	],
  	[
  		46077,
  		46103
  	],
  	[
  		46105,
  		46131
  	],
  	[
  		46133,
  		46159
  	],
  	[
  		46161,
  		46187
  	],
  	[
  		46189,
  		46215
  	],
  	[
  		46217,
  		46243
  	],
  	[
  		46245,
  		46271
  	],
  	[
  		46273,
  		46299
  	],
  	[
  		46301,
  		46327
  	],
  	[
  		46329,
  		46355
  	],
  	[
  		46357,
  		46383
  	],
  	[
  		46385,
  		46411
  	],
  	[
  		46413,
  		46439
  	],
  	[
  		46441,
  		46467
  	],
  	[
  		46469,
  		46495
  	],
  	[
  		46497,
  		46523
  	],
  	[
  		46525,
  		46551
  	],
  	[
  		46553,
  		46579
  	],
  	[
  		46581,
  		46607
  	],
  	[
  		46609,
  		46635
  	],
  	[
  		46637,
  		46663
  	],
  	[
  		46665,
  		46691
  	],
  	[
  		46693,
  		46719
  	],
  	[
  		46721,
  		46747
  	],
  	[
  		46749,
  		46775
  	],
  	[
  		46777,
  		46803
  	],
  	[
  		46805,
  		46831
  	],
  	[
  		46833,
  		46859
  	],
  	[
  		46861,
  		46887
  	],
  	[
  		46889,
  		46915
  	],
  	[
  		46917,
  		46943
  	],
  	[
  		46945,
  		46971
  	],
  	[
  		46973,
  		46999
  	],
  	[
  		47001,
  		47027
  	],
  	[
  		47029,
  		47055
  	],
  	[
  		47057,
  		47083
  	],
  	[
  		47085,
  		47111
  	],
  	[
  		47113,
  		47139
  	],
  	[
  		47141,
  		47167
  	],
  	[
  		47169,
  		47195
  	],
  	[
  		47197,
  		47223
  	],
  	[
  		47225,
  		47251
  	],
  	[
  		47253,
  		47279
  	],
  	[
  		47281,
  		47307
  	],
  	[
  		47309,
  		47335
  	],
  	[
  		47337,
  		47363
  	],
  	[
  		47365,
  		47391
  	],
  	[
  		47393,
  		47419
  	],
  	[
  		47421,
  		47447
  	],
  	[
  		47449,
  		47475
  	],
  	[
  		47477,
  		47503
  	],
  	[
  		47505,
  		47531
  	],
  	[
  		47533,
  		47559
  	],
  	[
  		47561,
  		47587
  	],
  	[
  		47589,
  		47615
  	],
  	[
  		47617,
  		47643
  	],
  	[
  		47645,
  		47671
  	],
  	[
  		47673,
  		47699
  	],
  	[
  		47701,
  		47727
  	],
  	[
  		47729,
  		47755
  	],
  	[
  		47757,
  		47783
  	],
  	[
  		47785,
  		47811
  	],
  	[
  		47813,
  		47839
  	],
  	[
  		47841,
  		47867
  	],
  	[
  		47869,
  		47895
  	],
  	[
  		47897,
  		47923
  	],
  	[
  		47925,
  		47951
  	],
  	[
  		47953,
  		47979
  	],
  	[
  		47981,
  		48007
  	],
  	[
  		48009,
  		48035
  	],
  	[
  		48037,
  		48063
  	],
  	[
  		48065,
  		48091
  	],
  	[
  		48093,
  		48119
  	],
  	[
  		48121,
  		48147
  	],
  	[
  		48149,
  		48175
  	],
  	[
  		48177,
  		48203
  	],
  	[
  		48205,
  		48231
  	],
  	[
  		48233,
  		48259
  	],
  	[
  		48261,
  		48287
  	],
  	[
  		48289,
  		48315
  	],
  	[
  		48317,
  		48343
  	],
  	[
  		48345,
  		48371
  	],
  	[
  		48373,
  		48399
  	],
  	[
  		48401,
  		48427
  	],
  	[
  		48429,
  		48455
  	],
  	[
  		48457,
  		48483
  	],
  	[
  		48485,
  		48511
  	],
  	[
  		48513,
  		48539
  	],
  	[
  		48541,
  		48567
  	],
  	[
  		48569,
  		48595
  	],
  	[
  		48597,
  		48623
  	],
  	[
  		48625,
  		48651
  	],
  	[
  		48653,
  		48679
  	],
  	[
  		48681,
  		48707
  	],
  	[
  		48709,
  		48735
  	],
  	[
  		48737,
  		48763
  	],
  	[
  		48765,
  		48791
  	],
  	[
  		48793,
  		48819
  	],
  	[
  		48821,
  		48847
  	],
  	[
  		48849,
  		48875
  	],
  	[
  		48877,
  		48903
  	],
  	[
  		48905,
  		48931
  	],
  	[
  		48933,
  		48959
  	],
  	[
  		48961,
  		48987
  	],
  	[
  		48989,
  		49015
  	],
  	[
  		49017,
  		49043
  	],
  	[
  		49045,
  		49071
  	],
  	[
  		49073,
  		49099
  	],
  	[
  		49101,
  		49127
  	],
  	[
  		49129,
  		49155
  	],
  	[
  		49157,
  		49183
  	],
  	[
  		49185,
  		49211
  	],
  	[
  		49213,
  		49239
  	],
  	[
  		49241,
  		49267
  	],
  	[
  		49269,
  		49295
  	],
  	[
  		49297,
  		49323
  	],
  	[
  		49325,
  		49351
  	],
  	[
  		49353,
  		49379
  	],
  	[
  		49381,
  		49407
  	],
  	[
  		49409,
  		49435
  	],
  	[
  		49437,
  		49463
  	],
  	[
  		49465,
  		49491
  	],
  	[
  		49493,
  		49519
  	],
  	[
  		49521,
  		49547
  	],
  	[
  		49549,
  		49575
  	],
  	[
  		49577,
  		49603
  	],
  	[
  		49605,
  		49631
  	],
  	[
  		49633,
  		49659
  	],
  	[
  		49661,
  		49687
  	],
  	[
  		49689,
  		49715
  	],
  	[
  		49717,
  		49743
  	],
  	[
  		49745,
  		49771
  	],
  	[
  		49773,
  		49799
  	],
  	[
  		49801,
  		49827
  	],
  	[
  		49829,
  		49855
  	],
  	[
  		49857,
  		49883
  	],
  	[
  		49885,
  		49911
  	],
  	[
  		49913,
  		49939
  	],
  	[
  		49941,
  		49967
  	],
  	[
  		49969,
  		49995
  	],
  	[
  		49997,
  		50023
  	],
  	[
  		50025,
  		50051
  	],
  	[
  		50053,
  		50079
  	],
  	[
  		50081,
  		50107
  	],
  	[
  		50109,
  		50135
  	],
  	[
  		50137,
  		50163
  	],
  	[
  		50165,
  		50191
  	],
  	[
  		50193,
  		50219
  	],
  	[
  		50221,
  		50247
  	],
  	[
  		50249,
  		50275
  	],
  	[
  		50277,
  		50303
  	],
  	[
  		50305,
  		50331
  	],
  	[
  		50333,
  		50359
  	],
  	[
  		50361,
  		50387
  	],
  	[
  		50389,
  		50415
  	],
  	[
  		50417,
  		50443
  	],
  	[
  		50445,
  		50471
  	],
  	[
  		50473,
  		50499
  	],
  	[
  		50501,
  		50527
  	],
  	[
  		50529,
  		50555
  	],
  	[
  		50557,
  		50583
  	],
  	[
  		50585,
  		50611
  	],
  	[
  		50613,
  		50639
  	],
  	[
  		50641,
  		50667
  	],
  	[
  		50669,
  		50695
  	],
  	[
  		50697,
  		50723
  	],
  	[
  		50725,
  		50751
  	],
  	[
  		50753,
  		50779
  	],
  	[
  		50781,
  		50807
  	],
  	[
  		50809,
  		50835
  	],
  	[
  		50837,
  		50863
  	],
  	[
  		50865,
  		50891
  	],
  	[
  		50893,
  		50919
  	],
  	[
  		50921,
  		50947
  	],
  	[
  		50949,
  		50975
  	],
  	[
  		50977,
  		51003
  	],
  	[
  		51005,
  		51031
  	],
  	[
  		51033,
  		51059
  	],
  	[
  		51061,
  		51087
  	],
  	[
  		51089,
  		51115
  	],
  	[
  		51117,
  		51143
  	],
  	[
  		51145,
  		51171
  	],
  	[
  		51173,
  		51199
  	],
  	[
  		51201,
  		51227
  	],
  	[
  		51229,
  		51255
  	],
  	[
  		51257,
  		51283
  	],
  	[
  		51285,
  		51311
  	],
  	[
  		51313,
  		51339
  	],
  	[
  		51341,
  		51367
  	],
  	[
  		51369,
  		51395
  	],
  	[
  		51397,
  		51423
  	],
  	[
  		51425,
  		51451
  	],
  	[
  		51453,
  		51479
  	],
  	[
  		51481,
  		51507
  	],
  	[
  		51509,
  		51535
  	],
  	[
  		51537,
  		51563
  	],
  	[
  		51565,
  		51591
  	],
  	[
  		51593,
  		51619
  	],
  	[
  		51621,
  		51647
  	],
  	[
  		51649,
  		51675
  	],
  	[
  		51677,
  		51703
  	],
  	[
  		51705,
  		51731
  	],
  	[
  		51733,
  		51759
  	],
  	[
  		51761,
  		51787
  	],
  	[
  		51789,
  		51815
  	],
  	[
  		51817,
  		51843
  	],
  	[
  		51845,
  		51871
  	],
  	[
  		51873,
  		51899
  	],
  	[
  		51901,
  		51927
  	],
  	[
  		51929,
  		51955
  	],
  	[
  		51957,
  		51983
  	],
  	[
  		51985,
  		52011
  	],
  	[
  		52013,
  		52039
  	],
  	[
  		52041,
  		52067
  	],
  	[
  		52069,
  		52095
  	],
  	[
  		52097,
  		52123
  	],
  	[
  		52125,
  		52151
  	],
  	[
  		52153,
  		52179
  	],
  	[
  		52181,
  		52207
  	],
  	[
  		52209,
  		52235
  	],
  	[
  		52237,
  		52263
  	],
  	[
  		52265,
  		52291
  	],
  	[
  		52293,
  		52319
  	],
  	[
  		52321,
  		52347
  	],
  	[
  		52349,
  		52375
  	],
  	[
  		52377,
  		52403
  	],
  	[
  		52405,
  		52431
  	],
  	[
  		52433,
  		52459
  	],
  	[
  		52461,
  		52487
  	],
  	[
  		52489,
  		52515
  	],
  	[
  		52517,
  		52543
  	],
  	[
  		52545,
  		52571
  	],
  	[
  		52573,
  		52599
  	],
  	[
  		52601,
  		52627
  	],
  	[
  		52629,
  		52655
  	],
  	[
  		52657,
  		52683
  	],
  	[
  		52685,
  		52711
  	],
  	[
  		52713,
  		52739
  	],
  	[
  		52741,
  		52767
  	],
  	[
  		52769,
  		52795
  	],
  	[
  		52797,
  		52823
  	],
  	[
  		52825,
  		52851
  	],
  	[
  		52853,
  		52879
  	],
  	[
  		52881,
  		52907
  	],
  	[
  		52909,
  		52935
  	],
  	[
  		52937,
  		52963
  	],
  	[
  		52965,
  		52991
  	],
  	[
  		52993,
  		53019
  	],
  	[
  		53021,
  		53047
  	],
  	[
  		53049,
  		53075
  	],
  	[
  		53077,
  		53103
  	],
  	[
  		53105,
  		53131
  	],
  	[
  		53133,
  		53159
  	],
  	[
  		53161,
  		53187
  	],
  	[
  		53189,
  		53215
  	],
  	[
  		53217,
  		53243
  	],
  	[
  		53245,
  		53271
  	],
  	[
  		53273,
  		53299
  	],
  	[
  		53301,
  		53327
  	],
  	[
  		53329,
  		53355
  	],
  	[
  		53357,
  		53383
  	],
  	[
  		53385,
  		53411
  	],
  	[
  		53413,
  		53439
  	],
  	[
  		53441,
  		53467
  	],
  	[
  		53469,
  		53495
  	],
  	[
  		53497,
  		53523
  	],
  	[
  		53525,
  		53551
  	],
  	[
  		53553,
  		53579
  	],
  	[
  		53581,
  		53607
  	],
  	[
  		53609,
  		53635
  	],
  	[
  		53637,
  		53663
  	],
  	[
  		53665,
  		53691
  	],
  	[
  		53693,
  		53719
  	],
  	[
  		53721,
  		53747
  	],
  	[
  		53749,
  		53775
  	],
  	[
  		53777,
  		53803
  	],
  	[
  		53805,
  		53831
  	],
  	[
  		53833,
  		53859
  	],
  	[
  		53861,
  		53887
  	],
  	[
  		53889,
  		53915
  	],
  	[
  		53917,
  		53943
  	],
  	[
  		53945,
  		53971
  	],
  	[
  		53973,
  		53999
  	],
  	[
  		54001,
  		54027
  	],
  	[
  		54029,
  		54055
  	],
  	[
  		54057,
  		54083
  	],
  	[
  		54085,
  		54111
  	],
  	[
  		54113,
  		54139
  	],
  	[
  		54141,
  		54167
  	],
  	[
  		54169,
  		54195
  	],
  	[
  		54197,
  		54223
  	],
  	[
  		54225,
  		54251
  	],
  	[
  		54253,
  		54279
  	],
  	[
  		54281,
  		54307
  	],
  	[
  		54309,
  		54335
  	],
  	[
  		54337,
  		54363
  	],
  	[
  		54365,
  		54391
  	],
  	[
  		54393,
  		54419
  	],
  	[
  		54421,
  		54447
  	],
  	[
  		54449,
  		54475
  	],
  	[
  		54477,
  		54503
  	],
  	[
  		54505,
  		54531
  	],
  	[
  		54533,
  		54559
  	],
  	[
  		54561,
  		54587
  	],
  	[
  		54589,
  		54615
  	],
  	[
  		54617,
  		54643
  	],
  	[
  		54645,
  		54671
  	],
  	[
  		54673,
  		54699
  	],
  	[
  		54701,
  		54727
  	],
  	[
  		54729,
  		54755
  	],
  	[
  		54757,
  		54783
  	],
  	[
  		54785,
  		54811
  	],
  	[
  		54813,
  		54839
  	],
  	[
  		54841,
  		54867
  	],
  	[
  		54869,
  		54895
  	],
  	[
  		54897,
  		54923
  	],
  	[
  		54925,
  		54951
  	],
  	[
  		54953,
  		54979
  	],
  	[
  		54981,
  		55007
  	],
  	[
  		55009,
  		55035
  	],
  	[
  		55037,
  		55063
  	],
  	[
  		55065,
  		55091
  	],
  	[
  		55093,
  		55119
  	],
  	[
  		55121,
  		55147
  	],
  	[
  		55149,
  		55175
  	],
  	[
  		55177,
  		55203
  	]
  ],
  	"Line_Break/Infix_Numeric": [
  	[
  		44,
  		44
  	],
  	[
  		46,
  		46
  	],
  	[
  		58,
  		59
  	],
  	[
  		894,
  		894
  	],
  	[
  		1417,
  		1417
  	],
  	[
  		1548,
  		1549
  	],
  	[
  		2040,
  		2040
  	],
  	[
  		8260,
  		8260
  	],
  	[
  		65040,
  		65040
  	],
  	[
  		65043,
  		65044
  	]
  ],
  	"Line_Break/Close_Punctuation": [
  	[
  		125,
  		125
  	],
  	[
  		3899,
  		3899
  	],
  	[
  		3901,
  		3901
  	],
  	[
  		5788,
  		5788
  	],
  	[
  		8262,
  		8262
  	],
  	[
  		8318,
  		8318
  	],
  	[
  		8334,
  		8334
  	],
  	[
  		8969,
  		8969
  	],
  	[
  		8971,
  		8971
  	],
  	[
  		9002,
  		9002
  	],
  	[
  		10089,
  		10089
  	],
  	[
  		10091,
  		10091
  	],
  	[
  		10093,
  		10093
  	],
  	[
  		10095,
  		10095
  	],
  	[
  		10097,
  		10097
  	],
  	[
  		10099,
  		10099
  	],
  	[
  		10101,
  		10101
  	],
  	[
  		10182,
  		10182
  	],
  	[
  		10215,
  		10215
  	],
  	[
  		10217,
  		10217
  	],
  	[
  		10219,
  		10219
  	],
  	[
  		10221,
  		10221
  	],
  	[
  		10223,
  		10223
  	],
  	[
  		10628,
  		10628
  	],
  	[
  		10630,
  		10630
  	],
  	[
  		10632,
  		10632
  	],
  	[
  		10634,
  		10634
  	],
  	[
  		10636,
  		10636
  	],
  	[
  		10638,
  		10638
  	],
  	[
  		10640,
  		10640
  	],
  	[
  		10642,
  		10642
  	],
  	[
  		10644,
  		10644
  	],
  	[
  		10646,
  		10646
  	],
  	[
  		10648,
  		10648
  	],
  	[
  		10713,
  		10713
  	],
  	[
  		10715,
  		10715
  	],
  	[
  		10749,
  		10749
  	],
  	[
  		11811,
  		11811
  	],
  	[
  		11813,
  		11813
  	],
  	[
  		11815,
  		11815
  	],
  	[
  		11817,
  		11817
  	],
  	[
  		12289,
  		12290
  	],
  	[
  		12297,
  		12297
  	],
  	[
  		12299,
  		12299
  	],
  	[
  		12301,
  		12301
  	],
  	[
  		12303,
  		12303
  	],
  	[
  		12305,
  		12305
  	],
  	[
  		12309,
  		12309
  	],
  	[
  		12311,
  		12311
  	],
  	[
  		12313,
  		12313
  	],
  	[
  		12315,
  		12315
  	],
  	[
  		12318,
  		12319
  	],
  	[
  		64830,
  		64830
  	],
  	[
  		65041,
  		65042
  	],
  	[
  		65048,
  		65048
  	],
  	[
  		65078,
  		65078
  	],
  	[
  		65080,
  		65080
  	],
  	[
  		65082,
  		65082
  	],
  	[
  		65084,
  		65084
  	],
  	[
  		65086,
  		65086
  	],
  	[
  		65088,
  		65088
  	],
  	[
  		65090,
  		65090
  	],
  	[
  		65092,
  		65092
  	],
  	[
  		65096,
  		65096
  	],
  	[
  		65104,
  		65104
  	],
  	[
  		65106,
  		65106
  	],
  	[
  		65114,
  		65114
  	],
  	[
  		65116,
  		65116
  	],
  	[
  		65118,
  		65118
  	],
  	[
  		65289,
  		65289
  	],
  	[
  		65292,
  		65292
  	],
  	[
  		65294,
  		65294
  	],
  	[
  		65341,
  		65341
  	],
  	[
  		65373,
  		65373
  	],
  	[
  		65376,
  		65377
  	],
  	[
  		65379,
  		65380
  	],
  	[
  		78427,
  		78429
  	],
  	[
  		78466,
  		78466
  	],
  	[
  		78471,
  		78471
  	],
  	[
  		78473,
  		78473
  	],
  	[
  		78714,
  		78715
  	],
  	[
  		78904,
  		78904
  	],
  	[
  		83407,
  		83407
  	]
  ],
  	"Line_Break/Mandatory_Break": [
  	[
  		11,
  		12
  	],
  	[
  		8232,
  		8233
  	]
  ],
  	"Line_Break/Break_Both": [
  	[
  		8212,
  		8212
  	],
  	[
  		11834,
  		11835
  	]
  ],
  	"Line_Break/Hyphen": [
  	[
  		45,
  		45
  	]
  ],
  	"Line_Break/Conditional_Japanese_Starter": [
  	[
  		12353,
  		12353
  	],
  	[
  		12355,
  		12355
  	],
  	[
  		12357,
  		12357
  	],
  	[
  		12359,
  		12359
  	],
  	[
  		12361,
  		12361
  	],
  	[
  		12387,
  		12387
  	],
  	[
  		12419,
  		12419
  	],
  	[
  		12421,
  		12421
  	],
  	[
  		12423,
  		12423
  	],
  	[
  		12430,
  		12430
  	],
  	[
  		12437,
  		12438
  	],
  	[
  		12449,
  		12449
  	],
  	[
  		12451,
  		12451
  	],
  	[
  		12453,
  		12453
  	],
  	[
  		12455,
  		12455
  	],
  	[
  		12457,
  		12457
  	],
  	[
  		12483,
  		12483
  	],
  	[
  		12515,
  		12515
  	],
  	[
  		12517,
  		12517
  	],
  	[
  		12519,
  		12519
  	],
  	[
  		12526,
  		12526
  	],
  	[
  		12533,
  		12534
  	],
  	[
  		12540,
  		12540
  	],
  	[
  		12784,
  		12799
  	],
  	[
  		65383,
  		65392
  	],
  	[
  		110928,
  		110930
  	],
  	[
  		110948,
  		110951
  	]
  ],
  	"Line_Break/Inseparable": [
  	[
  		8228,
  		8230
  	],
  	[
  		8943,
  		8943
  	],
  	[
  		65049,
  		65049
  	],
  	[
  		68342,
  		68342
  	]
  ],
  	"Line_Break/Carriage_Return": [
  	[
  		13,
  		13
  	]
  ],
  	"Line_Break/E_Base": [
  	[
  		9757,
  		9757
  	],
  	[
  		9977,
  		9977
  	],
  	[
  		9994,
  		9997
  	],
  	[
  		127877,
  		127877
  	],
  	[
  		127938,
  		127940
  	],
  	[
  		127943,
  		127943
  	],
  	[
  		127946,
  		127948
  	],
  	[
  		128066,
  		128067
  	],
  	[
  		128070,
  		128080
  	],
  	[
  		128102,
  		128120
  	],
  	[
  		128124,
  		128124
  	],
  	[
  		128129,
  		128131
  	],
  	[
  		128133,
  		128135
  	],
  	[
  		128143,
  		128143
  	],
  	[
  		128145,
  		128145
  	],
  	[
  		128170,
  		128170
  	],
  	[
  		128372,
  		128373
  	],
  	[
  		128378,
  		128378
  	],
  	[
  		128400,
  		128400
  	],
  	[
  		128405,
  		128406
  	],
  	[
  		128581,
  		128583
  	],
  	[
  		128587,
  		128591
  	],
  	[
  		128675,
  		128675
  	],
  	[
  		128692,
  		128694
  	],
  	[
  		128704,
  		128704
  	],
  	[
  		128716,
  		128716
  	],
  	[
  		129292,
  		129292
  	],
  	[
  		129295,
  		129295
  	],
  	[
  		129304,
  		129311
  	],
  	[
  		129318,
  		129318
  	],
  	[
  		129328,
  		129337
  	],
  	[
  		129340,
  		129342
  	],
  	[
  		129399,
  		129399
  	],
  	[
  		129461,
  		129462
  	],
  	[
  		129464,
  		129465
  	],
  	[
  		129467,
  		129467
  	],
  	[
  		129485,
  		129487
  	],
  	[
  		129489,
  		129501
  	]
  ],
  	"Line_Break/Ambiguous": [
  	[
  		167,
  		168
  	],
  	[
  		170,
  		170
  	],
  	[
  		178,
  		179
  	],
  	[
  		182,
  		186
  	],
  	[
  		188,
  		190
  	],
  	[
  		215,
  		215
  	],
  	[
  		247,
  		247
  	],
  	[
  		711,
  		711
  	],
  	[
  		713,
  		715
  	],
  	[
  		717,
  		717
  	],
  	[
  		720,
  		720
  	],
  	[
  		728,
  		731
  	],
  	[
  		733,
  		733
  	],
  	[
  		8213,
  		8214
  	],
  	[
  		8224,
  		8225
  	],
  	[
  		8251,
  		8251
  	],
  	[
  		8308,
  		8308
  	],
  	[
  		8319,
  		8319
  	],
  	[
  		8321,
  		8324
  	],
  	[
  		8453,
  		8453
  	],
  	[
  		8467,
  		8467
  	],
  	[
  		8481,
  		8482
  	],
  	[
  		8491,
  		8491
  	],
  	[
  		8532,
  		8533
  	],
  	[
  		8539,
  		8539
  	],
  	[
  		8542,
  		8542
  	],
  	[
  		8544,
  		8555
  	],
  	[
  		8560,
  		8569
  	],
  	[
  		8585,
  		8585
  	],
  	[
  		8592,
  		8601
  	],
  	[
  		8658,
  		8658
  	],
  	[
  		8660,
  		8660
  	],
  	[
  		8704,
  		8704
  	],
  	[
  		8706,
  		8707
  	],
  	[
  		8711,
  		8712
  	],
  	[
  		8715,
  		8715
  	],
  	[
  		8719,
  		8719
  	],
  	[
  		8721,
  		8721
  	],
  	[
  		8725,
  		8725
  	],
  	[
  		8730,
  		8730
  	],
  	[
  		8733,
  		8736
  	],
  	[
  		8739,
  		8739
  	],
  	[
  		8741,
  		8741
  	],
  	[
  		8743,
  		8748
  	],
  	[
  		8750,
  		8750
  	],
  	[
  		8756,
  		8759
  	],
  	[
  		8764,
  		8765
  	],
  	[
  		8776,
  		8776
  	],
  	[
  		8780,
  		8780
  	],
  	[
  		8786,
  		8786
  	],
  	[
  		8800,
  		8801
  	],
  	[
  		8804,
  		8807
  	],
  	[
  		8810,
  		8811
  	],
  	[
  		8814,
  		8815
  	],
  	[
  		8834,
  		8835
  	],
  	[
  		8838,
  		8839
  	],
  	[
  		8853,
  		8853
  	],
  	[
  		8857,
  		8857
  	],
  	[
  		8869,
  		8869
  	],
  	[
  		8895,
  		8895
  	],
  	[
  		8978,
  		8978
  	],
  	[
  		9312,
  		9470
  	],
  	[
  		9472,
  		9547
  	],
  	[
  		9552,
  		9588
  	],
  	[
  		9600,
  		9615
  	],
  	[
  		9618,
  		9621
  	],
  	[
  		9632,
  		9633
  	],
  	[
  		9635,
  		9641
  	],
  	[
  		9650,
  		9651
  	],
  	[
  		9654,
  		9655
  	],
  	[
  		9660,
  		9661
  	],
  	[
  		9664,
  		9665
  	],
  	[
  		9670,
  		9672
  	],
  	[
  		9675,
  		9675
  	],
  	[
  		9678,
  		9681
  	],
  	[
  		9698,
  		9701
  	],
  	[
  		9711,
  		9711
  	],
  	[
  		9733,
  		9734
  	],
  	[
  		9737,
  		9737
  	],
  	[
  		9742,
  		9743
  	],
  	[
  		9750,
  		9751
  	],
  	[
  		9792,
  		9792
  	],
  	[
  		9794,
  		9794
  	],
  	[
  		9824,
  		9825
  	],
  	[
  		9827,
  		9829
  	],
  	[
  		9831,
  		9831
  	],
  	[
  		9833,
  		9834
  	],
  	[
  		9836,
  		9837
  	],
  	[
  		9839,
  		9839
  	],
  	[
  		9886,
  		9887
  	],
  	[
  		9929,
  		9932
  	],
  	[
  		9938,
  		9938
  	],
  	[
  		9941,
  		9943
  	],
  	[
  		9946,
  		9947
  	],
  	[
  		9949,
  		9950
  	],
  	[
  		9955,
  		9955
  	],
  	[
  		9960,
  		9961
  	],
  	[
  		9963,
  		9968
  	],
  	[
  		9974,
  		9974
  	],
  	[
  		9979,
  		9980
  	],
  	[
  		10071,
  		10071
  	],
  	[
  		10102,
  		10131
  	],
  	[
  		11093,
  		11097
  	],
  	[
  		12872,
  		12879
  	],
  	[
  		65533,
  		65533
  	],
  	[
  		127232,
  		127244
  	],
  	[
  		127248,
  		127277
  	],
  	[
  		127280,
  		127337
  	],
  	[
  		127344,
  		127404
  	]
  ],
  	"Line_Break/Combining_Mark": [
  	[
  		0,
  		8
  	],
  	[
  		14,
  		31
  	],
  	[
  		127,
  		132
  	],
  	[
  		134,
  		159
  	],
  	[
  		768,
  		846
  	],
  	[
  		848,
  		859
  	],
  	[
  		867,
  		879
  	],
  	[
  		1155,
  		1161
  	],
  	[
  		1425,
  		1469
  	],
  	[
  		1471,
  		1471
  	],
  	[
  		1473,
  		1474
  	],
  	[
  		1476,
  		1477
  	],
  	[
  		1479,
  		1479
  	],
  	[
  		1552,
  		1562
  	],
  	[
  		1564,
  		1564
  	],
  	[
  		1611,
  		1631
  	],
  	[
  		1648,
  		1648
  	],
  	[
  		1750,
  		1756
  	],
  	[
  		1759,
  		1764
  	],
  	[
  		1767,
  		1768
  	],
  	[
  		1770,
  		1773
  	],
  	[
  		1809,
  		1809
  	],
  	[
  		1840,
  		1866
  	],
  	[
  		1958,
  		1968
  	],
  	[
  		2027,
  		2035
  	],
  	[
  		2045,
  		2045
  	],
  	[
  		2070,
  		2073
  	],
  	[
  		2075,
  		2083
  	],
  	[
  		2085,
  		2087
  	],
  	[
  		2089,
  		2093
  	],
  	[
  		2137,
  		2139
  	],
  	[
  		2259,
  		2273
  	],
  	[
  		2275,
  		2307
  	],
  	[
  		2362,
  		2364
  	],
  	[
  		2366,
  		2383
  	],
  	[
  		2385,
  		2391
  	],
  	[
  		2402,
  		2403
  	],
  	[
  		2433,
  		2435
  	],
  	[
  		2492,
  		2492
  	],
  	[
  		2494,
  		2500
  	],
  	[
  		2503,
  		2504
  	],
  	[
  		2507,
  		2509
  	],
  	[
  		2519,
  		2519
  	],
  	[
  		2530,
  		2531
  	],
  	[
  		2558,
  		2558
  	],
  	[
  		2561,
  		2563
  	],
  	[
  		2620,
  		2620
  	],
  	[
  		2622,
  		2626
  	],
  	[
  		2631,
  		2632
  	],
  	[
  		2635,
  		2637
  	],
  	[
  		2641,
  		2641
  	],
  	[
  		2672,
  		2673
  	],
  	[
  		2677,
  		2677
  	],
  	[
  		2689,
  		2691
  	],
  	[
  		2748,
  		2748
  	],
  	[
  		2750,
  		2757
  	],
  	[
  		2759,
  		2761
  	],
  	[
  		2763,
  		2765
  	],
  	[
  		2786,
  		2787
  	],
  	[
  		2810,
  		2815
  	],
  	[
  		2817,
  		2819
  	],
  	[
  		2876,
  		2876
  	],
  	[
  		2878,
  		2884
  	],
  	[
  		2887,
  		2888
  	],
  	[
  		2891,
  		2893
  	],
  	[
  		2901,
  		2903
  	],
  	[
  		2914,
  		2915
  	],
  	[
  		2946,
  		2946
  	],
  	[
  		3006,
  		3010
  	],
  	[
  		3014,
  		3016
  	],
  	[
  		3018,
  		3021
  	],
  	[
  		3031,
  		3031
  	],
  	[
  		3072,
  		3076
  	],
  	[
  		3134,
  		3140
  	],
  	[
  		3142,
  		3144
  	],
  	[
  		3146,
  		3149
  	],
  	[
  		3157,
  		3158
  	],
  	[
  		3170,
  		3171
  	],
  	[
  		3201,
  		3203
  	],
  	[
  		3260,
  		3260
  	],
  	[
  		3262,
  		3268
  	],
  	[
  		3270,
  		3272
  	],
  	[
  		3274,
  		3277
  	],
  	[
  		3285,
  		3286
  	],
  	[
  		3298,
  		3299
  	],
  	[
  		3328,
  		3331
  	],
  	[
  		3387,
  		3388
  	],
  	[
  		3390,
  		3396
  	],
  	[
  		3398,
  		3400
  	],
  	[
  		3402,
  		3405
  	],
  	[
  		3415,
  		3415
  	],
  	[
  		3426,
  		3427
  	],
  	[
  		3457,
  		3459
  	],
  	[
  		3530,
  		3530
  	],
  	[
  		3535,
  		3540
  	],
  	[
  		3542,
  		3542
  	],
  	[
  		3544,
  		3551
  	],
  	[
  		3570,
  		3571
  	],
  	[
  		3864,
  		3865
  	],
  	[
  		3893,
  		3893
  	],
  	[
  		3895,
  		3895
  	],
  	[
  		3897,
  		3897
  	],
  	[
  		3902,
  		3903
  	],
  	[
  		3953,
  		3966
  	],
  	[
  		3968,
  		3972
  	],
  	[
  		3974,
  		3975
  	],
  	[
  		3981,
  		3991
  	],
  	[
  		3993,
  		4028
  	],
  	[
  		4038,
  		4038
  	],
  	[
  		4957,
  		4959
  	],
  	[
  		5906,
  		5908
  	],
  	[
  		5938,
  		5940
  	],
  	[
  		5970,
  		5971
  	],
  	[
  		6002,
  		6003
  	],
  	[
  		6155,
  		6157
  	],
  	[
  		6277,
  		6278
  	],
  	[
  		6313,
  		6313
  	],
  	[
  		6432,
  		6443
  	],
  	[
  		6448,
  		6459
  	],
  	[
  		6679,
  		6683
  	],
  	[
  		6783,
  		6783
  	],
  	[
  		6832,
  		6848
  	],
  	[
  		6912,
  		6916
  	],
  	[
  		6964,
  		6980
  	],
  	[
  		7019,
  		7027
  	],
  	[
  		7040,
  		7042
  	],
  	[
  		7073,
  		7085
  	],
  	[
  		7142,
  		7155
  	],
  	[
  		7204,
  		7223
  	],
  	[
  		7376,
  		7378
  	],
  	[
  		7380,
  		7400
  	],
  	[
  		7405,
  		7405
  	],
  	[
  		7412,
  		7412
  	],
  	[
  		7415,
  		7417
  	],
  	[
  		7616,
  		7673
  	],
  	[
  		7675,
  		7679
  	],
  	[
  		8204,
  		8204
  	],
  	[
  		8206,
  		8207
  	],
  	[
  		8234,
  		8238
  	],
  	[
  		8294,
  		8303
  	],
  	[
  		8400,
  		8432
  	],
  	[
  		11503,
  		11505
  	],
  	[
  		11647,
  		11647
  	],
  	[
  		11744,
  		11775
  	],
  	[
  		12330,
  		12335
  	],
  	[
  		12341,
  		12341
  	],
  	[
  		12441,
  		12442
  	],
  	[
  		42607,
  		42610
  	],
  	[
  		42612,
  		42621
  	],
  	[
  		42654,
  		42655
  	],
  	[
  		42736,
  		42737
  	],
  	[
  		43010,
  		43010
  	],
  	[
  		43014,
  		43014
  	],
  	[
  		43019,
  		43019
  	],
  	[
  		43043,
  		43047
  	],
  	[
  		43052,
  		43052
  	],
  	[
  		43136,
  		43137
  	],
  	[
  		43188,
  		43205
  	],
  	[
  		43232,
  		43249
  	],
  	[
  		43263,
  		43263
  	],
  	[
  		43302,
  		43309
  	],
  	[
  		43335,
  		43347
  	],
  	[
  		43392,
  		43395
  	],
  	[
  		43443,
  		43456
  	],
  	[
  		43561,
  		43574
  	],
  	[
  		43587,
  		43587
  	],
  	[
  		43596,
  		43597
  	],
  	[
  		43755,
  		43759
  	],
  	[
  		43765,
  		43766
  	],
  	[
  		44003,
  		44010
  	],
  	[
  		44012,
  		44013
  	],
  	[
  		64286,
  		64286
  	],
  	[
  		65024,
  		65039
  	],
  	[
  		65056,
  		65071
  	],
  	[
  		65529,
  		65531
  	],
  	[
  		66045,
  		66045
  	],
  	[
  		66272,
  		66272
  	],
  	[
  		66422,
  		66426
  	],
  	[
  		68097,
  		68099
  	],
  	[
  		68101,
  		68102
  	],
  	[
  		68108,
  		68111
  	],
  	[
  		68152,
  		68154
  	],
  	[
  		68159,
  		68159
  	],
  	[
  		68325,
  		68326
  	],
  	[
  		68900,
  		68903
  	],
  	[
  		69291,
  		69292
  	],
  	[
  		69446,
  		69456
  	],
  	[
  		69632,
  		69634
  	],
  	[
  		69688,
  		69702
  	],
  	[
  		69759,
  		69762
  	],
  	[
  		69808,
  		69818
  	],
  	[
  		69888,
  		69890
  	],
  	[
  		69927,
  		69940
  	],
  	[
  		69957,
  		69958
  	],
  	[
  		70003,
  		70003
  	],
  	[
  		70016,
  		70018
  	],
  	[
  		70067,
  		70080
  	],
  	[
  		70089,
  		70092
  	],
  	[
  		70094,
  		70095
  	],
  	[
  		70188,
  		70199
  	],
  	[
  		70206,
  		70206
  	],
  	[
  		70367,
  		70378
  	],
  	[
  		70400,
  		70403
  	],
  	[
  		70459,
  		70460
  	],
  	[
  		70462,
  		70468
  	],
  	[
  		70471,
  		70472
  	],
  	[
  		70475,
  		70477
  	],
  	[
  		70487,
  		70487
  	],
  	[
  		70498,
  		70499
  	],
  	[
  		70502,
  		70508
  	],
  	[
  		70512,
  		70516
  	],
  	[
  		70709,
  		70726
  	],
  	[
  		70750,
  		70750
  	],
  	[
  		70832,
  		70851
  	],
  	[
  		71087,
  		71093
  	],
  	[
  		71096,
  		71104
  	],
  	[
  		71132,
  		71133
  	],
  	[
  		71216,
  		71232
  	],
  	[
  		71339,
  		71351
  	],
  	[
  		71724,
  		71738
  	],
  	[
  		71984,
  		71989
  	],
  	[
  		71991,
  		71992
  	],
  	[
  		71995,
  		71998
  	],
  	[
  		72000,
  		72000
  	],
  	[
  		72002,
  		72003
  	],
  	[
  		72145,
  		72151
  	],
  	[
  		72154,
  		72160
  	],
  	[
  		72164,
  		72164
  	],
  	[
  		72193,
  		72202
  	],
  	[
  		72243,
  		72249
  	],
  	[
  		72251,
  		72254
  	],
  	[
  		72263,
  		72263
  	],
  	[
  		72273,
  		72283
  	],
  	[
  		72330,
  		72345
  	],
  	[
  		72751,
  		72758
  	],
  	[
  		72760,
  		72767
  	],
  	[
  		72850,
  		72871
  	],
  	[
  		72873,
  		72886
  	],
  	[
  		73009,
  		73014
  	],
  	[
  		73018,
  		73018
  	],
  	[
  		73020,
  		73021
  	],
  	[
  		73023,
  		73029
  	],
  	[
  		73031,
  		73031
  	],
  	[
  		73098,
  		73102
  	],
  	[
  		73104,
  		73105
  	],
  	[
  		73107,
  		73111
  	],
  	[
  		73459,
  		73462
  	],
  	[
  		92912,
  		92916
  	],
  	[
  		92976,
  		92982
  	],
  	[
  		94031,
  		94031
  	],
  	[
  		94033,
  		94087
  	],
  	[
  		94095,
  		94098
  	],
  	[
  		94192,
  		94193
  	],
  	[
  		113821,
  		113822
  	],
  	[
  		113824,
  		113827
  	],
  	[
  		119141,
  		119145
  	],
  	[
  		119149,
  		119170
  	],
  	[
  		119173,
  		119179
  	],
  	[
  		119210,
  		119213
  	],
  	[
  		119362,
  		119364
  	],
  	[
  		121344,
  		121398
  	],
  	[
  		121403,
  		121452
  	],
  	[
  		121461,
  		121461
  	],
  	[
  		121476,
  		121476
  	],
  	[
  		121499,
  		121503
  	],
  	[
  		121505,
  		121519
  	],
  	[
  		122880,
  		122886
  	],
  	[
  		122888,
  		122904
  	],
  	[
  		122907,
  		122913
  	],
  	[
  		122915,
  		122916
  	],
  	[
  		122918,
  		122922
  	],
  	[
  		123184,
  		123190
  	],
  	[
  		123628,
  		123631
  	],
  	[
  		125136,
  		125142
  	],
  	[
  		125252,
  		125258
  	],
  	[
  		917505,
  		917505
  	],
  	[
  		917536,
  		917631
  	],
  	[
  		917760,
  		917999
  	]
  ],
  	"Line_Break/E_Modifier": [
  	[
  		127995,
  		127999
  	]
  ],
  	"Line_Break/Break_Symbols": [
  	[
  		47,
  		47
  	]
  ],
  	"Line_Break/Nonstarter": [
  	[
  		6102,
  		6102
  	],
  	[
  		8252,
  		8253
  	],
  	[
  		8263,
  		8265
  	],
  	[
  		12293,
  		12293
  	],
  	[
  		12316,
  		12316
  	],
  	[
  		12347,
  		12348
  	],
  	[
  		12443,
  		12446
  	],
  	[
  		12448,
  		12448
  	],
  	[
  		12539,
  		12539
  	],
  	[
  		12541,
  		12542
  	],
  	[
  		40981,
  		40981
  	],
  	[
  		65108,
  		65109
  	],
  	[
  		65306,
  		65307
  	],
  	[
  		65381,
  		65381
  	],
  	[
  		65438,
  		65439
  	],
  	[
  		94176,
  		94179
  	],
  	[
  		128633,
  		128635
  	]
  ],
  	"Line_Break/Surrogate": [
  	[
  		55296,
  		57343
  	]
  ],
  	"Line_Break/Complex_Context": [
  	[
  		3585,
  		3642
  	],
  	[
  		3648,
  		3662
  	],
  	[
  		3713,
  		3714
  	],
  	[
  		3716,
  		3716
  	],
  	[
  		3718,
  		3722
  	],
  	[
  		3724,
  		3747
  	],
  	[
  		3749,
  		3749
  	],
  	[
  		3751,
  		3773
  	],
  	[
  		3776,
  		3780
  	],
  	[
  		3782,
  		3782
  	],
  	[
  		3784,
  		3789
  	],
  	[
  		3804,
  		3807
  	],
  	[
  		4096,
  		4159
  	],
  	[
  		4176,
  		4239
  	],
  	[
  		4250,
  		4255
  	],
  	[
  		6016,
  		6099
  	],
  	[
  		6103,
  		6103
  	],
  	[
  		6108,
  		6109
  	],
  	[
  		6480,
  		6509
  	],
  	[
  		6512,
  		6516
  	],
  	[
  		6528,
  		6571
  	],
  	[
  		6576,
  		6601
  	],
  	[
  		6618,
  		6618
  	],
  	[
  		6622,
  		6623
  	],
  	[
  		6688,
  		6750
  	],
  	[
  		6752,
  		6780
  	],
  	[
  		6816,
  		6829
  	],
  	[
  		43488,
  		43503
  	],
  	[
  		43514,
  		43518
  	],
  	[
  		43616,
  		43714
  	],
  	[
  		43739,
  		43743
  	],
  	[
  		71424,
  		71450
  	],
  	[
  		71453,
  		71467
  	],
  	[
  		71482,
  		71483
  	],
  	[
  		71487,
  		71487
  	]
  ],
  	"Line_Break/Break_After": [
  	[
  		9,
  		9
  	],
  	[
  		124,
  		124
  	],
  	[
  		173,
  		173
  	],
  	[
  		1418,
  		1418
  	],
  	[
  		1470,
  		1470
  	],
  	[
  		2404,
  		2405
  	],
  	[
  		3674,
  		3675
  	],
  	[
  		3851,
  		3851
  	],
  	[
  		3892,
  		3892
  	],
  	[
  		3967,
  		3967
  	],
  	[
  		3973,
  		3973
  	],
  	[
  		4030,
  		4031
  	],
  	[
  		4050,
  		4050
  	],
  	[
  		4170,
  		4171
  	],
  	[
  		4961,
  		4961
  	],
  	[
  		5120,
  		5120
  	],
  	[
  		5760,
  		5760
  	],
  	[
  		5867,
  		5869
  	],
  	[
  		5941,
  		5942
  	],
  	[
  		6100,
  		6101
  	],
  	[
  		6104,
  		6104
  	],
  	[
  		6106,
  		6106
  	],
  	[
  		6148,
  		6149
  	],
  	[
  		7002,
  		7003
  	],
  	[
  		7005,
  		7008
  	],
  	[
  		7227,
  		7231
  	],
  	[
  		7294,
  		7295
  	],
  	[
  		8192,
  		8198
  	],
  	[
  		8200,
  		8202
  	],
  	[
  		8208,
  		8208
  	],
  	[
  		8210,
  		8211
  	],
  	[
  		8231,
  		8231
  	],
  	[
  		8278,
  		8278
  	],
  	[
  		8280,
  		8283
  	],
  	[
  		8285,
  		8287
  	],
  	[
  		11514,
  		11516
  	],
  	[
  		11519,
  		11519
  	],
  	[
  		11632,
  		11632
  	],
  	[
  		11790,
  		11797
  	],
  	[
  		11799,
  		11799
  	],
  	[
  		11801,
  		11801
  	],
  	[
  		11818,
  		11821
  	],
  	[
  		11824,
  		11825
  	],
  	[
  		11827,
  		11828
  	],
  	[
  		11836,
  		11838
  	],
  	[
  		11840,
  		11841
  	],
  	[
  		11843,
  		11850
  	],
  	[
  		11852,
  		11852
  	],
  	[
  		11854,
  		11855
  	],
  	[
  		12288,
  		12288
  	],
  	[
  		42238,
  		42239
  	],
  	[
  		42509,
  		42509
  	],
  	[
  		42511,
  		42511
  	],
  	[
  		42739,
  		42743
  	],
  	[
  		43214,
  		43215
  	],
  	[
  		43310,
  		43311
  	],
  	[
  		43463,
  		43465
  	],
  	[
  		43613,
  		43615
  	],
  	[
  		43760,
  		43761
  	],
  	[
  		44011,
  		44011
  	],
  	[
  		65792,
  		65794
  	],
  	[
  		66463,
  		66463
  	],
  	[
  		66512,
  		66512
  	],
  	[
  		67671,
  		67671
  	],
  	[
  		67871,
  		67871
  	],
  	[
  		68176,
  		68183
  	],
  	[
  		68336,
  		68341
  	],
  	[
  		68409,
  		68415
  	],
  	[
  		69293,
  		69293
  	],
  	[
  		69703,
  		69704
  	],
  	[
  		69822,
  		69825
  	],
  	[
  		69952,
  		69955
  	],
  	[
  		70085,
  		70086
  	],
  	[
  		70088,
  		70088
  	],
  	[
  		70109,
  		70111
  	],
  	[
  		70200,
  		70201
  	],
  	[
  		70203,
  		70204
  	],
  	[
  		70313,
  		70313
  	],
  	[
  		70731,
  		70734
  	],
  	[
  		70746,
  		70747
  	],
  	[
  		71106,
  		71107
  	],
  	[
  		71113,
  		71127
  	],
  	[
  		71233,
  		71234
  	],
  	[
  		71484,
  		71486
  	],
  	[
  		72004,
  		72006
  	],
  	[
  		72257,
  		72260
  	],
  	[
  		72346,
  		72348
  	],
  	[
  		72353,
  		72354
  	],
  	[
  		72769,
  		72773
  	],
  	[
  		73727,
  		73727
  	],
  	[
  		74864,
  		74868
  	],
  	[
  		92782,
  		92783
  	],
  	[
  		92917,
  		92917
  	],
  	[
  		92983,
  		92985
  	],
  	[
  		92996,
  		92996
  	],
  	[
  		93847,
  		93848
  	],
  	[
  		113823,
  		113823
  	],
  	[
  		121479,
  		121482
  	]
  ],
  	"Line_Break/Unknown": [
  	[
  		57344,
  		63743
  	],
  	[
  		983040,
  		1048573
  	],
  	[
  		1048576,
  		1114109
  	],
  	[
  		888,
  		889
  	],
  	[
  		896,
  		899
  	],
  	[
  		907,
  		907
  	],
  	[
  		909,
  		909
  	],
  	[
  		930,
  		930
  	],
  	[
  		1328,
  		1328
  	],
  	[
  		1367,
  		1368
  	],
  	[
  		1419,
  		1420
  	],
  	[
  		1424,
  		1424
  	],
  	[
  		1480,
  		1487
  	],
  	[
  		1515,
  		1518
  	],
  	[
  		1525,
  		1535
  	],
  	[
  		1565,
  		1565
  	],
  	[
  		1806,
  		1806
  	],
  	[
  		1867,
  		1868
  	],
  	[
  		1970,
  		1983
  	],
  	[
  		2043,
  		2044
  	],
  	[
  		2094,
  		2095
  	],
  	[
  		2111,
  		2111
  	],
  	[
  		2140,
  		2141
  	],
  	[
  		2143,
  		2143
  	],
  	[
  		2155,
  		2207
  	],
  	[
  		2229,
  		2229
  	],
  	[
  		2248,
  		2258
  	],
  	[
  		2436,
  		2436
  	],
  	[
  		2445,
  		2446
  	],
  	[
  		2449,
  		2450
  	],
  	[
  		2473,
  		2473
  	],
  	[
  		2481,
  		2481
  	],
  	[
  		2483,
  		2485
  	],
  	[
  		2490,
  		2491
  	],
  	[
  		2501,
  		2502
  	],
  	[
  		2505,
  		2506
  	],
  	[
  		2511,
  		2518
  	],
  	[
  		2520,
  		2523
  	],
  	[
  		2526,
  		2526
  	],
  	[
  		2532,
  		2533
  	],
  	[
  		2559,
  		2560
  	],
  	[
  		2564,
  		2564
  	],
  	[
  		2571,
  		2574
  	],
  	[
  		2577,
  		2578
  	],
  	[
  		2601,
  		2601
  	],
  	[
  		2609,
  		2609
  	],
  	[
  		2612,
  		2612
  	],
  	[
  		2615,
  		2615
  	],
  	[
  		2618,
  		2619
  	],
  	[
  		2621,
  		2621
  	],
  	[
  		2627,
  		2630
  	],
  	[
  		2633,
  		2634
  	],
  	[
  		2638,
  		2640
  	],
  	[
  		2642,
  		2648
  	],
  	[
  		2653,
  		2653
  	],
  	[
  		2655,
  		2661
  	],
  	[
  		2679,
  		2688
  	],
  	[
  		2692,
  		2692
  	],
  	[
  		2702,
  		2702
  	],
  	[
  		2706,
  		2706
  	],
  	[
  		2729,
  		2729
  	],
  	[
  		2737,
  		2737
  	],
  	[
  		2740,
  		2740
  	],
  	[
  		2746,
  		2747
  	],
  	[
  		2758,
  		2758
  	],
  	[
  		2762,
  		2762
  	],
  	[
  		2766,
  		2767
  	],
  	[
  		2769,
  		2783
  	],
  	[
  		2788,
  		2789
  	],
  	[
  		2802,
  		2808
  	],
  	[
  		2816,
  		2816
  	],
  	[
  		2820,
  		2820
  	],
  	[
  		2829,
  		2830
  	],
  	[
  		2833,
  		2834
  	],
  	[
  		2857,
  		2857
  	],
  	[
  		2865,
  		2865
  	],
  	[
  		2868,
  		2868
  	],
  	[
  		2874,
  		2875
  	],
  	[
  		2885,
  		2886
  	],
  	[
  		2889,
  		2890
  	],
  	[
  		2894,
  		2900
  	],
  	[
  		2904,
  		2907
  	],
  	[
  		2910,
  		2910
  	],
  	[
  		2916,
  		2917
  	],
  	[
  		2936,
  		2945
  	],
  	[
  		2948,
  		2948
  	],
  	[
  		2955,
  		2957
  	],
  	[
  		2961,
  		2961
  	],
  	[
  		2966,
  		2968
  	],
  	[
  		2971,
  		2971
  	],
  	[
  		2973,
  		2973
  	],
  	[
  		2976,
  		2978
  	],
  	[
  		2981,
  		2983
  	],
  	[
  		2987,
  		2989
  	],
  	[
  		3002,
  		3005
  	],
  	[
  		3011,
  		3013
  	],
  	[
  		3017,
  		3017
  	],
  	[
  		3022,
  		3023
  	],
  	[
  		3025,
  		3030
  	],
  	[
  		3032,
  		3045
  	],
  	[
  		3067,
  		3071
  	],
  	[
  		3085,
  		3085
  	],
  	[
  		3089,
  		3089
  	],
  	[
  		3113,
  		3113
  	],
  	[
  		3130,
  		3132
  	],
  	[
  		3141,
  		3141
  	],
  	[
  		3145,
  		3145
  	],
  	[
  		3150,
  		3156
  	],
  	[
  		3159,
  		3159
  	],
  	[
  		3163,
  		3167
  	],
  	[
  		3172,
  		3173
  	],
  	[
  		3184,
  		3190
  	],
  	[
  		3213,
  		3213
  	],
  	[
  		3217,
  		3217
  	],
  	[
  		3241,
  		3241
  	],
  	[
  		3252,
  		3252
  	],
  	[
  		3258,
  		3259
  	],
  	[
  		3269,
  		3269
  	],
  	[
  		3273,
  		3273
  	],
  	[
  		3278,
  		3284
  	],
  	[
  		3287,
  		3293
  	],
  	[
  		3295,
  		3295
  	],
  	[
  		3300,
  		3301
  	],
  	[
  		3312,
  		3312
  	],
  	[
  		3315,
  		3327
  	],
  	[
  		3341,
  		3341
  	],
  	[
  		3345,
  		3345
  	],
  	[
  		3397,
  		3397
  	],
  	[
  		3401,
  		3401
  	],
  	[
  		3408,
  		3411
  	],
  	[
  		3428,
  		3429
  	],
  	[
  		3456,
  		3456
  	],
  	[
  		3460,
  		3460
  	],
  	[
  		3479,
  		3481
  	],
  	[
  		3506,
  		3506
  	],
  	[
  		3516,
  		3516
  	],
  	[
  		3518,
  		3519
  	],
  	[
  		3527,
  		3529
  	],
  	[
  		3531,
  		3534
  	],
  	[
  		3541,
  		3541
  	],
  	[
  		3543,
  		3543
  	],
  	[
  		3552,
  		3557
  	],
  	[
  		3568,
  		3569
  	],
  	[
  		3573,
  		3584
  	],
  	[
  		3643,
  		3646
  	],
  	[
  		3676,
  		3712
  	],
  	[
  		3715,
  		3715
  	],
  	[
  		3717,
  		3717
  	],
  	[
  		3723,
  		3723
  	],
  	[
  		3748,
  		3748
  	],
  	[
  		3750,
  		3750
  	],
  	[
  		3774,
  		3775
  	],
  	[
  		3781,
  		3781
  	],
  	[
  		3783,
  		3783
  	],
  	[
  		3790,
  		3791
  	],
  	[
  		3802,
  		3803
  	],
  	[
  		3808,
  		3839
  	],
  	[
  		3912,
  		3912
  	],
  	[
  		3949,
  		3952
  	],
  	[
  		3992,
  		3992
  	],
  	[
  		4029,
  		4029
  	],
  	[
  		4045,
  		4045
  	],
  	[
  		4059,
  		4095
  	],
  	[
  		4294,
  		4294
  	],
  	[
  		4296,
  		4300
  	],
  	[
  		4302,
  		4303
  	],
  	[
  		4681,
  		4681
  	],
  	[
  		4686,
  		4687
  	],
  	[
  		4695,
  		4695
  	],
  	[
  		4697,
  		4697
  	],
  	[
  		4702,
  		4703
  	],
  	[
  		4745,
  		4745
  	],
  	[
  		4750,
  		4751
  	],
  	[
  		4785,
  		4785
  	],
  	[
  		4790,
  		4791
  	],
  	[
  		4799,
  		4799
  	],
  	[
  		4801,
  		4801
  	],
  	[
  		4806,
  		4807
  	],
  	[
  		4823,
  		4823
  	],
  	[
  		4881,
  		4881
  	],
  	[
  		4886,
  		4887
  	],
  	[
  		4955,
  		4956
  	],
  	[
  		4989,
  		4991
  	],
  	[
  		5018,
  		5023
  	],
  	[
  		5110,
  		5111
  	],
  	[
  		5118,
  		5119
  	],
  	[
  		5789,
  		5791
  	],
  	[
  		5881,
  		5887
  	],
  	[
  		5901,
  		5901
  	],
  	[
  		5909,
  		5919
  	],
  	[
  		5943,
  		5951
  	],
  	[
  		5972,
  		5983
  	],
  	[
  		5997,
  		5997
  	],
  	[
  		6001,
  		6001
  	],
  	[
  		6004,
  		6015
  	],
  	[
  		6110,
  		6111
  	],
  	[
  		6122,
  		6127
  	],
  	[
  		6138,
  		6143
  	],
  	[
  		6159,
  		6159
  	],
  	[
  		6170,
  		6175
  	],
  	[
  		6265,
  		6271
  	],
  	[
  		6315,
  		6319
  	],
  	[
  		6390,
  		6399
  	],
  	[
  		6431,
  		6431
  	],
  	[
  		6444,
  		6447
  	],
  	[
  		6460,
  		6463
  	],
  	[
  		6465,
  		6467
  	],
  	[
  		6510,
  		6511
  	],
  	[
  		6517,
  		6527
  	],
  	[
  		6572,
  		6575
  	],
  	[
  		6602,
  		6607
  	],
  	[
  		6619,
  		6621
  	],
  	[
  		6684,
  		6685
  	],
  	[
  		6751,
  		6751
  	],
  	[
  		6781,
  		6782
  	],
  	[
  		6794,
  		6799
  	],
  	[
  		6810,
  		6815
  	],
  	[
  		6830,
  		6831
  	],
  	[
  		6849,
  		6911
  	],
  	[
  		6988,
  		6991
  	],
  	[
  		7037,
  		7039
  	],
  	[
  		7156,
  		7163
  	],
  	[
  		7224,
  		7226
  	],
  	[
  		7242,
  		7244
  	],
  	[
  		7305,
  		7311
  	],
  	[
  		7355,
  		7356
  	],
  	[
  		7368,
  		7375
  	],
  	[
  		7419,
  		7423
  	],
  	[
  		7674,
  		7674
  	],
  	[
  		7958,
  		7959
  	],
  	[
  		7966,
  		7967
  	],
  	[
  		8006,
  		8007
  	],
  	[
  		8014,
  		8015
  	],
  	[
  		8024,
  		8024
  	],
  	[
  		8026,
  		8026
  	],
  	[
  		8028,
  		8028
  	],
  	[
  		8030,
  		8030
  	],
  	[
  		8062,
  		8063
  	],
  	[
  		8117,
  		8117
  	],
  	[
  		8133,
  		8133
  	],
  	[
  		8148,
  		8149
  	],
  	[
  		8156,
  		8156
  	],
  	[
  		8176,
  		8177
  	],
  	[
  		8181,
  		8181
  	],
  	[
  		8191,
  		8191
  	],
  	[
  		8293,
  		8293
  	],
  	[
  		8306,
  		8307
  	],
  	[
  		8335,
  		8335
  	],
  	[
  		8349,
  		8351
  	],
  	[
  		8433,
  		8447
  	],
  	[
  		8588,
  		8591
  	],
  	[
  		9255,
  		9279
  	],
  	[
  		9291,
  		9311
  	],
  	[
  		11124,
  		11125
  	],
  	[
  		11158,
  		11158
  	],
  	[
  		11311,
  		11311
  	],
  	[
  		11359,
  		11359
  	],
  	[
  		11508,
  		11512
  	],
  	[
  		11558,
  		11558
  	],
  	[
  		11560,
  		11564
  	],
  	[
  		11566,
  		11567
  	],
  	[
  		11624,
  		11630
  	],
  	[
  		11633,
  		11646
  	],
  	[
  		11671,
  		11679
  	],
  	[
  		11687,
  		11687
  	],
  	[
  		11695,
  		11695
  	],
  	[
  		11703,
  		11703
  	],
  	[
  		11711,
  		11711
  	],
  	[
  		11719,
  		11719
  	],
  	[
  		11727,
  		11727
  	],
  	[
  		11735,
  		11735
  	],
  	[
  		11743,
  		11743
  	],
  	[
  		11859,
  		11903
  	],
  	[
  		11930,
  		11930
  	],
  	[
  		12020,
  		12031
  	],
  	[
  		12246,
  		12271
  	],
  	[
  		12284,
  		12287
  	],
  	[
  		12352,
  		12352
  	],
  	[
  		12439,
  		12440
  	],
  	[
  		12544,
  		12548
  	],
  	[
  		12592,
  		12592
  	],
  	[
  		12687,
  		12687
  	],
  	[
  		12772,
  		12783
  	],
  	[
  		12831,
  		12831
  	],
  	[
  		42125,
  		42127
  	],
  	[
  		42183,
  		42191
  	],
  	[
  		42540,
  		42559
  	],
  	[
  		42744,
  		42751
  	],
  	[
  		42944,
  		42945
  	],
  	[
  		42955,
  		42996
  	],
  	[
  		43053,
  		43055
  	],
  	[
  		43066,
  		43071
  	],
  	[
  		43128,
  		43135
  	],
  	[
  		43206,
  		43213
  	],
  	[
  		43226,
  		43231
  	],
  	[
  		43348,
  		43358
  	],
  	[
  		43389,
  		43391
  	],
  	[
  		43470,
  		43470
  	],
  	[
  		43482,
  		43485
  	],
  	[
  		43519,
  		43519
  	],
  	[
  		43575,
  		43583
  	],
  	[
  		43598,
  		43599
  	],
  	[
  		43610,
  		43611
  	],
  	[
  		43715,
  		43738
  	],
  	[
  		43767,
  		43776
  	],
  	[
  		43783,
  		43784
  	],
  	[
  		43791,
  		43792
  	],
  	[
  		43799,
  		43807
  	],
  	[
  		43815,
  		43815
  	],
  	[
  		43823,
  		43823
  	],
  	[
  		43884,
  		43887
  	],
  	[
  		44014,
  		44015
  	],
  	[
  		44026,
  		44031
  	],
  	[
  		55204,
  		55215
  	],
  	[
  		55239,
  		55242
  	],
  	[
  		55292,
  		55295
  	],
  	[
  		64263,
  		64274
  	],
  	[
  		64280,
  		64284
  	],
  	[
  		64311,
  		64311
  	],
  	[
  		64317,
  		64317
  	],
  	[
  		64319,
  		64319
  	],
  	[
  		64322,
  		64322
  	],
  	[
  		64325,
  		64325
  	],
  	[
  		64450,
  		64466
  	],
  	[
  		64832,
  		64847
  	],
  	[
  		64912,
  		64913
  	],
  	[
  		64968,
  		65007
  	],
  	[
  		65022,
  		65023
  	],
  	[
  		65050,
  		65055
  	],
  	[
  		65107,
  		65107
  	],
  	[
  		65127,
  		65127
  	],
  	[
  		65132,
  		65135
  	],
  	[
  		65141,
  		65141
  	],
  	[
  		65277,
  		65278
  	],
  	[
  		65280,
  		65280
  	],
  	[
  		65471,
  		65473
  	],
  	[
  		65480,
  		65481
  	],
  	[
  		65488,
  		65489
  	],
  	[
  		65496,
  		65497
  	],
  	[
  		65501,
  		65503
  	],
  	[
  		65511,
  		65511
  	],
  	[
  		65519,
  		65528
  	],
  	[
  		65534,
  		65535
  	],
  	[
  		65548,
  		65548
  	],
  	[
  		65575,
  		65575
  	],
  	[
  		65595,
  		65595
  	],
  	[
  		65598,
  		65598
  	],
  	[
  		65614,
  		65615
  	],
  	[
  		65630,
  		65663
  	],
  	[
  		65787,
  		65791
  	],
  	[
  		65795,
  		65798
  	],
  	[
  		65844,
  		65846
  	],
  	[
  		65935,
  		65935
  	],
  	[
  		65949,
  		65951
  	],
  	[
  		65953,
  		65999
  	],
  	[
  		66046,
  		66175
  	],
  	[
  		66205,
  		66207
  	],
  	[
  		66257,
  		66271
  	],
  	[
  		66300,
  		66303
  	],
  	[
  		66340,
  		66348
  	],
  	[
  		66379,
  		66383
  	],
  	[
  		66427,
  		66431
  	],
  	[
  		66462,
  		66462
  	],
  	[
  		66500,
  		66503
  	],
  	[
  		66518,
  		66559
  	],
  	[
  		66718,
  		66719
  	],
  	[
  		66730,
  		66735
  	],
  	[
  		66772,
  		66775
  	],
  	[
  		66812,
  		66815
  	],
  	[
  		66856,
  		66863
  	],
  	[
  		66916,
  		66926
  	],
  	[
  		66928,
  		67071
  	],
  	[
  		67383,
  		67391
  	],
  	[
  		67414,
  		67423
  	],
  	[
  		67432,
  		67583
  	],
  	[
  		67590,
  		67591
  	],
  	[
  		67593,
  		67593
  	],
  	[
  		67638,
  		67638
  	],
  	[
  		67641,
  		67643
  	],
  	[
  		67645,
  		67646
  	],
  	[
  		67670,
  		67670
  	],
  	[
  		67743,
  		67750
  	],
  	[
  		67760,
  		67807
  	],
  	[
  		67827,
  		67827
  	],
  	[
  		67830,
  		67834
  	],
  	[
  		67868,
  		67870
  	],
  	[
  		67898,
  		67902
  	],
  	[
  		67904,
  		67967
  	],
  	[
  		68024,
  		68027
  	],
  	[
  		68048,
  		68049
  	],
  	[
  		68100,
  		68100
  	],
  	[
  		68103,
  		68107
  	],
  	[
  		68116,
  		68116
  	],
  	[
  		68120,
  		68120
  	],
  	[
  		68150,
  		68151
  	],
  	[
  		68155,
  		68158
  	],
  	[
  		68169,
  		68175
  	],
  	[
  		68185,
  		68191
  	],
  	[
  		68256,
  		68287
  	],
  	[
  		68327,
  		68330
  	],
  	[
  		68343,
  		68351
  	],
  	[
  		68406,
  		68408
  	],
  	[
  		68438,
  		68439
  	],
  	[
  		68467,
  		68471
  	],
  	[
  		68498,
  		68504
  	],
  	[
  		68509,
  		68520
  	],
  	[
  		68528,
  		68607
  	],
  	[
  		68681,
  		68735
  	],
  	[
  		68787,
  		68799
  	],
  	[
  		68851,
  		68857
  	],
  	[
  		68904,
  		68911
  	],
  	[
  		68922,
  		69215
  	],
  	[
  		69247,
  		69247
  	],
  	[
  		69290,
  		69290
  	],
  	[
  		69294,
  		69295
  	],
  	[
  		69298,
  		69375
  	],
  	[
  		69416,
  		69423
  	],
  	[
  		69466,
  		69551
  	],
  	[
  		69580,
  		69599
  	],
  	[
  		69623,
  		69631
  	],
  	[
  		69710,
  		69713
  	],
  	[
  		69744,
  		69758
  	],
  	[
  		69826,
  		69836
  	],
  	[
  		69838,
  		69839
  	],
  	[
  		69865,
  		69871
  	],
  	[
  		69882,
  		69887
  	],
  	[
  		69941,
  		69941
  	],
  	[
  		69960,
  		69967
  	],
  	[
  		70007,
  		70015
  	],
  	[
  		70112,
  		70112
  	],
  	[
  		70133,
  		70143
  	],
  	[
  		70162,
  		70162
  	],
  	[
  		70207,
  		70271
  	],
  	[
  		70279,
  		70279
  	],
  	[
  		70281,
  		70281
  	],
  	[
  		70286,
  		70286
  	],
  	[
  		70302,
  		70302
  	],
  	[
  		70314,
  		70319
  	],
  	[
  		70379,
  		70383
  	],
  	[
  		70394,
  		70399
  	],
  	[
  		70404,
  		70404
  	],
  	[
  		70413,
  		70414
  	],
  	[
  		70417,
  		70418
  	],
  	[
  		70441,
  		70441
  	],
  	[
  		70449,
  		70449
  	],
  	[
  		70452,
  		70452
  	],
  	[
  		70458,
  		70458
  	],
  	[
  		70469,
  		70470
  	],
  	[
  		70473,
  		70474
  	],
  	[
  		70478,
  		70479
  	],
  	[
  		70481,
  		70486
  	],
  	[
  		70488,
  		70492
  	],
  	[
  		70500,
  		70501
  	],
  	[
  		70509,
  		70511
  	],
  	[
  		70517,
  		70655
  	],
  	[
  		70748,
  		70748
  	],
  	[
  		70754,
  		70783
  	],
  	[
  		70856,
  		70863
  	],
  	[
  		70874,
  		71039
  	],
  	[
  		71094,
  		71095
  	],
  	[
  		71134,
  		71167
  	],
  	[
  		71237,
  		71247
  	],
  	[
  		71258,
  		71263
  	],
  	[
  		71277,
  		71295
  	],
  	[
  		71353,
  		71359
  	],
  	[
  		71370,
  		71423
  	],
  	[
  		71451,
  		71452
  	],
  	[
  		71468,
  		71471
  	],
  	[
  		71488,
  		71679
  	],
  	[
  		71740,
  		71839
  	],
  	[
  		71923,
  		71934
  	],
  	[
  		71943,
  		71944
  	],
  	[
  		71946,
  		71947
  	],
  	[
  		71956,
  		71956
  	],
  	[
  		71959,
  		71959
  	],
  	[
  		71990,
  		71990
  	],
  	[
  		71993,
  		71994
  	],
  	[
  		72007,
  		72015
  	],
  	[
  		72026,
  		72095
  	],
  	[
  		72104,
  		72105
  	],
  	[
  		72152,
  		72153
  	],
  	[
  		72165,
  		72191
  	],
  	[
  		72264,
  		72271
  	],
  	[
  		72355,
  		72383
  	],
  	[
  		72441,
  		72703
  	],
  	[
  		72713,
  		72713
  	],
  	[
  		72759,
  		72759
  	],
  	[
  		72774,
  		72783
  	],
  	[
  		72813,
  		72815
  	],
  	[
  		72848,
  		72849
  	],
  	[
  		72872,
  		72872
  	],
  	[
  		72887,
  		72959
  	],
  	[
  		72967,
  		72967
  	],
  	[
  		72970,
  		72970
  	],
  	[
  		73015,
  		73017
  	],
  	[
  		73019,
  		73019
  	],
  	[
  		73022,
  		73022
  	],
  	[
  		73032,
  		73039
  	],
  	[
  		73050,
  		73055
  	],
  	[
  		73062,
  		73062
  	],
  	[
  		73065,
  		73065
  	],
  	[
  		73103,
  		73103
  	],
  	[
  		73106,
  		73106
  	],
  	[
  		73113,
  		73119
  	],
  	[
  		73130,
  		73439
  	],
  	[
  		73465,
  		73647
  	],
  	[
  		73649,
  		73663
  	],
  	[
  		73714,
  		73726
  	],
  	[
  		74650,
  		74751
  	],
  	[
  		74863,
  		74863
  	],
  	[
  		74869,
  		74879
  	],
  	[
  		75076,
  		77823
  	],
  	[
  		78895,
  		78895
  	],
  	[
  		78905,
  		82943
  	],
  	[
  		83527,
  		92159
  	],
  	[
  		92729,
  		92735
  	],
  	[
  		92767,
  		92767
  	],
  	[
  		92778,
  		92781
  	],
  	[
  		92784,
  		92879
  	],
  	[
  		92910,
  		92911
  	],
  	[
  		92918,
  		92927
  	],
  	[
  		92998,
  		93007
  	],
  	[
  		93018,
  		93018
  	],
  	[
  		93026,
  		93026
  	],
  	[
  		93048,
  		93052
  	],
  	[
  		93072,
  		93759
  	],
  	[
  		93851,
  		93951
  	],
  	[
  		94027,
  		94030
  	],
  	[
  		94088,
  		94094
  	],
  	[
  		94112,
  		94175
  	],
  	[
  		94181,
  		94191
  	],
  	[
  		94194,
  		94207
  	],
  	[
  		100344,
  		100351
  	],
  	[
  		101590,
  		101631
  	],
  	[
  		101641,
  		110591
  	],
  	[
  		110879,
  		110927
  	],
  	[
  		110931,
  		110947
  	],
  	[
  		110952,
  		110959
  	],
  	[
  		111356,
  		113663
  	],
  	[
  		113771,
  		113775
  	],
  	[
  		113789,
  		113791
  	],
  	[
  		113801,
  		113807
  	],
  	[
  		113818,
  		113819
  	],
  	[
  		113828,
  		118783
  	],
  	[
  		119030,
  		119039
  	],
  	[
  		119079,
  		119080
  	],
  	[
  		119273,
  		119295
  	],
  	[
  		119366,
  		119519
  	],
  	[
  		119540,
  		119551
  	],
  	[
  		119639,
  		119647
  	],
  	[
  		119673,
  		119807
  	],
  	[
  		119893,
  		119893
  	],
  	[
  		119965,
  		119965
  	],
  	[
  		119968,
  		119969
  	],
  	[
  		119971,
  		119972
  	],
  	[
  		119975,
  		119976
  	],
  	[
  		119981,
  		119981
  	],
  	[
  		119994,
  		119994
  	],
  	[
  		119996,
  		119996
  	],
  	[
  		120004,
  		120004
  	],
  	[
  		120070,
  		120070
  	],
  	[
  		120075,
  		120076
  	],
  	[
  		120085,
  		120085
  	],
  	[
  		120093,
  		120093
  	],
  	[
  		120122,
  		120122
  	],
  	[
  		120127,
  		120127
  	],
  	[
  		120133,
  		120133
  	],
  	[
  		120135,
  		120137
  	],
  	[
  		120145,
  		120145
  	],
  	[
  		120486,
  		120487
  	],
  	[
  		120780,
  		120781
  	],
  	[
  		121484,
  		121498
  	],
  	[
  		121504,
  		121504
  	],
  	[
  		121520,
  		122879
  	],
  	[
  		122887,
  		122887
  	],
  	[
  		122905,
  		122906
  	],
  	[
  		122914,
  		122914
  	],
  	[
  		122917,
  		122917
  	],
  	[
  		122923,
  		123135
  	],
  	[
  		123181,
  		123183
  	],
  	[
  		123198,
  		123199
  	],
  	[
  		123210,
  		123213
  	],
  	[
  		123216,
  		123583
  	],
  	[
  		123642,
  		123646
  	],
  	[
  		123648,
  		124927
  	],
  	[
  		125125,
  		125126
  	],
  	[
  		125143,
  		125183
  	],
  	[
  		125260,
  		125263
  	],
  	[
  		125274,
  		125277
  	],
  	[
  		125280,
  		126064
  	],
  	[
  		126133,
  		126208
  	],
  	[
  		126270,
  		126463
  	],
  	[
  		126468,
  		126468
  	],
  	[
  		126496,
  		126496
  	],
  	[
  		126499,
  		126499
  	],
  	[
  		126501,
  		126502
  	],
  	[
  		126504,
  		126504
  	],
  	[
  		126515,
  		126515
  	],
  	[
  		126520,
  		126520
  	],
  	[
  		126522,
  		126522
  	],
  	[
  		126524,
  		126529
  	],
  	[
  		126531,
  		126534
  	],
  	[
  		126536,
  		126536
  	],
  	[
  		126538,
  		126538
  	],
  	[
  		126540,
  		126540
  	],
  	[
  		126544,
  		126544
  	],
  	[
  		126547,
  		126547
  	],
  	[
  		126549,
  		126550
  	],
  	[
  		126552,
  		126552
  	],
  	[
  		126554,
  		126554
  	],
  	[
  		126556,
  		126556
  	],
  	[
  		126558,
  		126558
  	],
  	[
  		126560,
  		126560
  	],
  	[
  		126563,
  		126563
  	],
  	[
  		126565,
  		126566
  	],
  	[
  		126571,
  		126571
  	],
  	[
  		126579,
  		126579
  	],
  	[
  		126584,
  		126584
  	],
  	[
  		126589,
  		126589
  	],
  	[
  		126591,
  		126591
  	],
  	[
  		126602,
  		126602
  	],
  	[
  		126620,
  		126624
  	],
  	[
  		126628,
  		126628
  	],
  	[
  		126634,
  		126634
  	],
  	[
  		126652,
  		126703
  	],
  	[
  		126706,
  		126975
  	],
  	[
  		129939,
  		129939
  	],
  	[
  		129995,
  		130031
  	],
  	[
  		130042,
  		130047
  	],
  	[
  		131070,
  		131071
  	],
  	[
  		196606,
  		196607
  	],
  	[
  		262142,
  		917504
  	],
  	[
  		917506,
  		917535
  	],
  	[
  		917632,
  		917759
  	],
  	[
  		918000,
  		983039
  	],
  	[
  		1048574,
  		1048575
  	],
  	[
  		1114110,
  		1114111
  	]
  ],
  	"Line_Break/Contingent_Break": [
  	[
  		65532,
  		65532
  	]
  ],
  	"Line_Break/Exclamation": [
  	[
  		33,
  		33
  	],
  	[
  		63,
  		63
  	],
  	[
  		1478,
  		1478
  	],
  	[
  		1563,
  		1563
  	],
  	[
  		1566,
  		1567
  	],
  	[
  		1748,
  		1748
  	],
  	[
  		2041,
  		2041
  	],
  	[
  		3853,
  		3857
  	],
  	[
  		3860,
  		3860
  	],
  	[
  		6146,
  		6147
  	],
  	[
  		6152,
  		6153
  	],
  	[
  		6468,
  		6469
  	],
  	[
  		10082,
  		10083
  	],
  	[
  		11513,
  		11513
  	],
  	[
  		11518,
  		11518
  	],
  	[
  		11822,
  		11822
  	],
  	[
  		42510,
  		42510
  	],
  	[
  		43126,
  		43127
  	],
  	[
  		65045,
  		65046
  	],
  	[
  		65110,
  		65111
  	],
  	[
  		65281,
  		65281
  	],
  	[
  		65311,
  		65311
  	],
  	[
  		71108,
  		71109
  	],
  	[
  		72817,
  		72817
  	]
  ],
  	"Line_Break/Postfix_Numeric": [
  	[
  		37,
  		37
  	],
  	[
  		162,
  		162
  	],
  	[
  		176,
  		176
  	],
  	[
  		1545,
  		1547
  	],
  	[
  		1642,
  		1642
  	],
  	[
  		2546,
  		2547
  	],
  	[
  		2553,
  		2553
  	],
  	[
  		3449,
  		3449
  	],
  	[
  		8240,
  		8247
  	],
  	[
  		8359,
  		8359
  	],
  	[
  		8374,
  		8374
  	],
  	[
  		8379,
  		8379
  	],
  	[
  		8382,
  		8382
  	],
  	[
  		8451,
  		8451
  	],
  	[
  		8457,
  		8457
  	],
  	[
  		43064,
  		43064
  	],
  	[
  		65020,
  		65020
  	],
  	[
  		65130,
  		65130
  	],
  	[
  		65285,
  		65285
  	],
  	[
  		65504,
  		65504
  	],
  	[
  		73693,
  		73696
  	],
  	[
  		126124,
  		126124
  	],
  	[
  		126128,
  		126128
  	]
  ],
  	"Line_Break/Alphabetic": [
  	[
  		35,
  		35
  	],
  	[
  		38,
  		38
  	],
  	[
  		42,
  		42
  	],
  	[
  		60,
  		62
  	],
  	[
  		64,
  		90
  	],
  	[
  		94,
  		122
  	],
  	[
  		126,
  		126
  	],
  	[
  		166,
  		166
  	],
  	[
  		169,
  		169
  	],
  	[
  		172,
  		172
  	],
  	[
  		174,
  		175
  	],
  	[
  		181,
  		181
  	],
  	[
  		192,
  		214
  	],
  	[
  		216,
  		246
  	],
  	[
  		248,
  		710
  	],
  	[
  		718,
  		719
  	],
  	[
  		721,
  		727
  	],
  	[
  		732,
  		732
  	],
  	[
  		734,
  		734
  	],
  	[
  		736,
  		767
  	],
  	[
  		880,
  		887
  	],
  	[
  		890,
  		893
  	],
  	[
  		895,
  		895
  	],
  	[
  		900,
  		906
  	],
  	[
  		908,
  		908
  	],
  	[
  		910,
  		929
  	],
  	[
  		931,
  		1154
  	],
  	[
  		1162,
  		1327
  	],
  	[
  		1329,
  		1366
  	],
  	[
  		1369,
  		1416
  	],
  	[
  		1421,
  		1422
  	],
  	[
  		1472,
  		1472
  	],
  	[
  		1475,
  		1475
  	],
  	[
  		1523,
  		1524
  	],
  	[
  		1536,
  		1544
  	],
  	[
  		1550,
  		1551
  	],
  	[
  		1568,
  		1610
  	],
  	[
  		1645,
  		1647
  	],
  	[
  		1649,
  		1747
  	],
  	[
  		1749,
  		1749
  	],
  	[
  		1757,
  		1758
  	],
  	[
  		1765,
  		1766
  	],
  	[
  		1769,
  		1769
  	],
  	[
  		1774,
  		1775
  	],
  	[
  		1786,
  		1805
  	],
  	[
  		1807,
  		1808
  	],
  	[
  		1810,
  		1839
  	],
  	[
  		1869,
  		1957
  	],
  	[
  		1969,
  		1969
  	],
  	[
  		1994,
  		2026
  	],
  	[
  		2036,
  		2039
  	],
  	[
  		2042,
  		2042
  	],
  	[
  		2048,
  		2069
  	],
  	[
  		2074,
  		2074
  	],
  	[
  		2084,
  		2084
  	],
  	[
  		2088,
  		2088
  	],
  	[
  		2096,
  		2110
  	],
  	[
  		2112,
  		2136
  	],
  	[
  		2142,
  		2142
  	],
  	[
  		2144,
  		2154
  	],
  	[
  		2208,
  		2228
  	],
  	[
  		2230,
  		2247
  	],
  	[
  		2274,
  		2274
  	],
  	[
  		2308,
  		2361
  	],
  	[
  		2365,
  		2365
  	],
  	[
  		2384,
  		2384
  	],
  	[
  		2392,
  		2401
  	],
  	[
  		2416,
  		2432
  	],
  	[
  		2437,
  		2444
  	],
  	[
  		2447,
  		2448
  	],
  	[
  		2451,
  		2472
  	],
  	[
  		2474,
  		2480
  	],
  	[
  		2482,
  		2482
  	],
  	[
  		2486,
  		2489
  	],
  	[
  		2493,
  		2493
  	],
  	[
  		2510,
  		2510
  	],
  	[
  		2524,
  		2525
  	],
  	[
  		2527,
  		2529
  	],
  	[
  		2544,
  		2545
  	],
  	[
  		2548,
  		2552
  	],
  	[
  		2554,
  		2554
  	],
  	[
  		2556,
  		2557
  	],
  	[
  		2565,
  		2570
  	],
  	[
  		2575,
  		2576
  	],
  	[
  		2579,
  		2600
  	],
  	[
  		2602,
  		2608
  	],
  	[
  		2610,
  		2611
  	],
  	[
  		2613,
  		2614
  	],
  	[
  		2616,
  		2617
  	],
  	[
  		2649,
  		2652
  	],
  	[
  		2654,
  		2654
  	],
  	[
  		2674,
  		2676
  	],
  	[
  		2678,
  		2678
  	],
  	[
  		2693,
  		2701
  	],
  	[
  		2703,
  		2705
  	],
  	[
  		2707,
  		2728
  	],
  	[
  		2730,
  		2736
  	],
  	[
  		2738,
  		2739
  	],
  	[
  		2741,
  		2745
  	],
  	[
  		2749,
  		2749
  	],
  	[
  		2768,
  		2768
  	],
  	[
  		2784,
  		2785
  	],
  	[
  		2800,
  		2800
  	],
  	[
  		2809,
  		2809
  	],
  	[
  		2821,
  		2828
  	],
  	[
  		2831,
  		2832
  	],
  	[
  		2835,
  		2856
  	],
  	[
  		2858,
  		2864
  	],
  	[
  		2866,
  		2867
  	],
  	[
  		2869,
  		2873
  	],
  	[
  		2877,
  		2877
  	],
  	[
  		2908,
  		2909
  	],
  	[
  		2911,
  		2913
  	],
  	[
  		2928,
  		2935
  	],
  	[
  		2947,
  		2947
  	],
  	[
  		2949,
  		2954
  	],
  	[
  		2958,
  		2960
  	],
  	[
  		2962,
  		2965
  	],
  	[
  		2969,
  		2970
  	],
  	[
  		2972,
  		2972
  	],
  	[
  		2974,
  		2975
  	],
  	[
  		2979,
  		2980
  	],
  	[
  		2984,
  		2986
  	],
  	[
  		2990,
  		3001
  	],
  	[
  		3024,
  		3024
  	],
  	[
  		3056,
  		3064
  	],
  	[
  		3066,
  		3066
  	],
  	[
  		3077,
  		3084
  	],
  	[
  		3086,
  		3088
  	],
  	[
  		3090,
  		3112
  	],
  	[
  		3114,
  		3129
  	],
  	[
  		3133,
  		3133
  	],
  	[
  		3160,
  		3162
  	],
  	[
  		3168,
  		3169
  	],
  	[
  		3192,
  		3200
  	],
  	[
  		3205,
  		3212
  	],
  	[
  		3214,
  		3216
  	],
  	[
  		3218,
  		3240
  	],
  	[
  		3242,
  		3251
  	],
  	[
  		3253,
  		3257
  	],
  	[
  		3261,
  		3261
  	],
  	[
  		3294,
  		3294
  	],
  	[
  		3296,
  		3297
  	],
  	[
  		3313,
  		3314
  	],
  	[
  		3332,
  		3340
  	],
  	[
  		3342,
  		3344
  	],
  	[
  		3346,
  		3386
  	],
  	[
  		3389,
  		3389
  	],
  	[
  		3406,
  		3407
  	],
  	[
  		3412,
  		3414
  	],
  	[
  		3416,
  		3425
  	],
  	[
  		3440,
  		3448
  	],
  	[
  		3450,
  		3455
  	],
  	[
  		3461,
  		3478
  	],
  	[
  		3482,
  		3505
  	],
  	[
  		3507,
  		3515
  	],
  	[
  		3517,
  		3517
  	],
  	[
  		3520,
  		3526
  	],
  	[
  		3572,
  		3572
  	],
  	[
  		3663,
  		3663
  	],
  	[
  		3840,
  		3840
  	],
  	[
  		3845,
  		3845
  	],
  	[
  		3859,
  		3859
  	],
  	[
  		3861,
  		3863
  	],
  	[
  		3866,
  		3871
  	],
  	[
  		3882,
  		3891
  	],
  	[
  		3894,
  		3894
  	],
  	[
  		3896,
  		3896
  	],
  	[
  		3904,
  		3911
  	],
  	[
  		3913,
  		3948
  	],
  	[
  		3976,
  		3980
  	],
  	[
  		4032,
  		4037
  	],
  	[
  		4039,
  		4044
  	],
  	[
  		4046,
  		4047
  	],
  	[
  		4052,
  		4056
  	],
  	[
  		4172,
  		4175
  	],
  	[
  		4256,
  		4293
  	],
  	[
  		4295,
  		4295
  	],
  	[
  		4301,
  		4301
  	],
  	[
  		4304,
  		4351
  	],
  	[
  		4608,
  		4680
  	],
  	[
  		4682,
  		4685
  	],
  	[
  		4688,
  		4694
  	],
  	[
  		4696,
  		4696
  	],
  	[
  		4698,
  		4701
  	],
  	[
  		4704,
  		4744
  	],
  	[
  		4746,
  		4749
  	],
  	[
  		4752,
  		4784
  	],
  	[
  		4786,
  		4789
  	],
  	[
  		4792,
  		4798
  	],
  	[
  		4800,
  		4800
  	],
  	[
  		4802,
  		4805
  	],
  	[
  		4808,
  		4822
  	],
  	[
  		4824,
  		4880
  	],
  	[
  		4882,
  		4885
  	],
  	[
  		4888,
  		4954
  	],
  	[
  		4960,
  		4960
  	],
  	[
  		4962,
  		4988
  	],
  	[
  		4992,
  		5017
  	],
  	[
  		5024,
  		5109
  	],
  	[
  		5112,
  		5117
  	],
  	[
  		5121,
  		5759
  	],
  	[
  		5761,
  		5786
  	],
  	[
  		5792,
  		5866
  	],
  	[
  		5870,
  		5880
  	],
  	[
  		5888,
  		5900
  	],
  	[
  		5902,
  		5905
  	],
  	[
  		5920,
  		5937
  	],
  	[
  		5952,
  		5969
  	],
  	[
  		5984,
  		5996
  	],
  	[
  		5998,
  		6000
  	],
  	[
  		6105,
  		6105
  	],
  	[
  		6128,
  		6137
  	],
  	[
  		6144,
  		6145
  	],
  	[
  		6151,
  		6151
  	],
  	[
  		6154,
  		6154
  	],
  	[
  		6176,
  		6264
  	],
  	[
  		6272,
  		6276
  	],
  	[
  		6279,
  		6312
  	],
  	[
  		6314,
  		6314
  	],
  	[
  		6320,
  		6389
  	],
  	[
  		6400,
  		6430
  	],
  	[
  		6464,
  		6464
  	],
  	[
  		6624,
  		6678
  	],
  	[
  		6686,
  		6687
  	],
  	[
  		6917,
  		6963
  	],
  	[
  		6981,
  		6987
  	],
  	[
  		7004,
  		7004
  	],
  	[
  		7009,
  		7018
  	],
  	[
  		7028,
  		7036
  	],
  	[
  		7043,
  		7072
  	],
  	[
  		7086,
  		7087
  	],
  	[
  		7098,
  		7141
  	],
  	[
  		7164,
  		7203
  	],
  	[
  		7245,
  		7247
  	],
  	[
  		7258,
  		7293
  	],
  	[
  		7296,
  		7304
  	],
  	[
  		7312,
  		7354
  	],
  	[
  		7357,
  		7367
  	],
  	[
  		7379,
  		7379
  	],
  	[
  		7401,
  		7404
  	],
  	[
  		7406,
  		7411
  	],
  	[
  		7413,
  		7414
  	],
  	[
  		7418,
  		7418
  	],
  	[
  		7424,
  		7615
  	],
  	[
  		7680,
  		7957
  	],
  	[
  		7960,
  		7965
  	],
  	[
  		7968,
  		8005
  	],
  	[
  		8008,
  		8013
  	],
  	[
  		8016,
  		8023
  	],
  	[
  		8025,
  		8025
  	],
  	[
  		8027,
  		8027
  	],
  	[
  		8029,
  		8029
  	],
  	[
  		8031,
  		8061
  	],
  	[
  		8064,
  		8116
  	],
  	[
  		8118,
  		8132
  	],
  	[
  		8134,
  		8147
  	],
  	[
  		8150,
  		8155
  	],
  	[
  		8157,
  		8175
  	],
  	[
  		8178,
  		8180
  	],
  	[
  		8182,
  		8188
  	],
  	[
  		8190,
  		8190
  	],
  	[
  		8215,
  		8215
  	],
  	[
  		8226,
  		8227
  	],
  	[
  		8248,
  		8248
  	],
  	[
  		8254,
  		8259
  	],
  	[
  		8266,
  		8277
  	],
  	[
  		8279,
  		8279
  	],
  	[
  		8284,
  		8284
  	],
  	[
  		8289,
  		8292
  	],
  	[
  		8304,
  		8305
  	],
  	[
  		8309,
  		8316
  	],
  	[
  		8320,
  		8320
  	],
  	[
  		8325,
  		8332
  	],
  	[
  		8336,
  		8348
  	],
  	[
  		8448,
  		8450
  	],
  	[
  		8452,
  		8452
  	],
  	[
  		8454,
  		8456
  	],
  	[
  		8458,
  		8466
  	],
  	[
  		8468,
  		8469
  	],
  	[
  		8471,
  		8480
  	],
  	[
  		8483,
  		8490
  	],
  	[
  		8492,
  		8531
  	],
  	[
  		8534,
  		8538
  	],
  	[
  		8540,
  		8541
  	],
  	[
  		8543,
  		8543
  	],
  	[
  		8556,
  		8559
  	],
  	[
  		8570,
  		8584
  	],
  	[
  		8586,
  		8587
  	],
  	[
  		8602,
  		8657
  	],
  	[
  		8659,
  		8659
  	],
  	[
  		8661,
  		8703
  	],
  	[
  		8705,
  		8705
  	],
  	[
  		8708,
  		8710
  	],
  	[
  		8713,
  		8714
  	],
  	[
  		8716,
  		8718
  	],
  	[
  		8720,
  		8720
  	],
  	[
  		8724,
  		8724
  	],
  	[
  		8726,
  		8729
  	],
  	[
  		8731,
  		8732
  	],
  	[
  		8737,
  		8738
  	],
  	[
  		8740,
  		8740
  	],
  	[
  		8742,
  		8742
  	],
  	[
  		8749,
  		8749
  	],
  	[
  		8751,
  		8755
  	],
  	[
  		8760,
  		8763
  	],
  	[
  		8766,
  		8775
  	],
  	[
  		8777,
  		8779
  	],
  	[
  		8781,
  		8785
  	],
  	[
  		8787,
  		8799
  	],
  	[
  		8802,
  		8803
  	],
  	[
  		8808,
  		8809
  	],
  	[
  		8812,
  		8813
  	],
  	[
  		8816,
  		8833
  	],
  	[
  		8836,
  		8837
  	],
  	[
  		8840,
  		8852
  	],
  	[
  		8854,
  		8856
  	],
  	[
  		8858,
  		8868
  	],
  	[
  		8870,
  		8894
  	],
  	[
  		8896,
  		8942
  	],
  	[
  		8944,
  		8967
  	],
  	[
  		8972,
  		8977
  	],
  	[
  		8979,
  		8985
  	],
  	[
  		8988,
  		9000
  	],
  	[
  		9003,
  		9199
  	],
  	[
  		9204,
  		9254
  	],
  	[
  		9280,
  		9290
  	],
  	[
  		9471,
  		9471
  	],
  	[
  		9548,
  		9551
  	],
  	[
  		9589,
  		9599
  	],
  	[
  		9616,
  		9617
  	],
  	[
  		9622,
  		9631
  	],
  	[
  		9634,
  		9634
  	],
  	[
  		9642,
  		9649
  	],
  	[
  		9652,
  		9653
  	],
  	[
  		9656,
  		9659
  	],
  	[
  		9662,
  		9663
  	],
  	[
  		9666,
  		9669
  	],
  	[
  		9673,
  		9674
  	],
  	[
  		9676,
  		9677
  	],
  	[
  		9682,
  		9697
  	],
  	[
  		9702,
  		9710
  	],
  	[
  		9712,
  		9727
  	],
  	[
  		9732,
  		9732
  	],
  	[
  		9735,
  		9736
  	],
  	[
  		9738,
  		9741
  	],
  	[
  		9744,
  		9747
  	],
  	[
  		9753,
  		9753
  	],
  	[
  		9760,
  		9784
  	],
  	[
  		9788,
  		9791
  	],
  	[
  		9793,
  		9793
  	],
  	[
  		9795,
  		9823
  	],
  	[
  		9826,
  		9826
  	],
  	[
  		9830,
  		9830
  	],
  	[
  		9835,
  		9835
  	],
  	[
  		9838,
  		9838
  	],
  	[
  		9840,
  		9854
  	],
  	[
  		9856,
  		9885
  	],
  	[
  		9888,
  		9916
  	],
  	[
  		9934,
  		9934
  	],
  	[
  		9954,
  		9954
  	],
  	[
  		9956,
  		9959
  	],
  	[
  		9989,
  		9991
  	],
  	[
  		9998,
  		10070
  	],
  	[
  		10072,
  		10074
  	],
  	[
  		10081,
  		10081
  	],
  	[
  		10085,
  		10087
  	],
  	[
  		10132,
  		10180
  	],
  	[
  		10183,
  		10213
  	],
  	[
  		10224,
  		10626
  	],
  	[
  		10649,
  		10711
  	],
  	[
  		10716,
  		10747
  	],
  	[
  		10750,
  		11092
  	],
  	[
  		11098,
  		11123
  	],
  	[
  		11126,
  		11157
  	],
  	[
  		11159,
  		11310
  	],
  	[
  		11312,
  		11358
  	],
  	[
  		11360,
  		11502
  	],
  	[
  		11506,
  		11507
  	],
  	[
  		11517,
  		11517
  	],
  	[
  		11520,
  		11557
  	],
  	[
  		11559,
  		11559
  	],
  	[
  		11565,
  		11565
  	],
  	[
  		11568,
  		11623
  	],
  	[
  		11631,
  		11631
  	],
  	[
  		11648,
  		11670
  	],
  	[
  		11680,
  		11686
  	],
  	[
  		11688,
  		11694
  	],
  	[
  		11696,
  		11702
  	],
  	[
  		11704,
  		11710
  	],
  	[
  		11712,
  		11718
  	],
  	[
  		11720,
  		11726
  	],
  	[
  		11728,
  		11734
  	],
  	[
  		11736,
  		11742
  	],
  	[
  		11798,
  		11798
  	],
  	[
  		11802,
  		11803
  	],
  	[
  		11806,
  		11807
  	],
  	[
  		11823,
  		11823
  	],
  	[
  		11826,
  		11826
  	],
  	[
  		11829,
  		11833
  	],
  	[
  		11839,
  		11839
  	],
  	[
  		11851,
  		11851
  	],
  	[
  		11853,
  		11853
  	],
  	[
  		11856,
  		11858
  	],
  	[
  		19904,
  		19967
  	],
  	[
  		42192,
  		42237
  	],
  	[
  		42240,
  		42508
  	],
  	[
  		42512,
  		42527
  	],
  	[
  		42538,
  		42539
  	],
  	[
  		42560,
  		42606
  	],
  	[
  		42611,
  		42611
  	],
  	[
  		42622,
  		42653
  	],
  	[
  		42656,
  		42735
  	],
  	[
  		42738,
  		42738
  	],
  	[
  		42752,
  		42943
  	],
  	[
  		42946,
  		42954
  	],
  	[
  		42997,
  		43009
  	],
  	[
  		43011,
  		43013
  	],
  	[
  		43015,
  		43018
  	],
  	[
  		43020,
  		43042
  	],
  	[
  		43048,
  		43051
  	],
  	[
  		43056,
  		43063
  	],
  	[
  		43065,
  		43065
  	],
  	[
  		43072,
  		43123
  	],
  	[
  		43138,
  		43187
  	],
  	[
  		43250,
  		43259
  	],
  	[
  		43261,
  		43262
  	],
  	[
  		43274,
  		43301
  	],
  	[
  		43312,
  		43334
  	],
  	[
  		43359,
  		43359
  	],
  	[
  		43396,
  		43442
  	],
  	[
  		43457,
  		43462
  	],
  	[
  		43466,
  		43469
  	],
  	[
  		43471,
  		43471
  	],
  	[
  		43486,
  		43487
  	],
  	[
  		43520,
  		43560
  	],
  	[
  		43584,
  		43586
  	],
  	[
  		43588,
  		43595
  	],
  	[
  		43612,
  		43612
  	],
  	[
  		43744,
  		43754
  	],
  	[
  		43762,
  		43764
  	],
  	[
  		43777,
  		43782
  	],
  	[
  		43785,
  		43790
  	],
  	[
  		43793,
  		43798
  	],
  	[
  		43808,
  		43814
  	],
  	[
  		43816,
  		43822
  	],
  	[
  		43824,
  		43883
  	],
  	[
  		43888,
  		44002
  	],
  	[
  		64256,
  		64262
  	],
  	[
  		64275,
  		64279
  	],
  	[
  		64297,
  		64297
  	],
  	[
  		64336,
  		64449
  	],
  	[
  		64467,
  		64829
  	],
  	[
  		64848,
  		64911
  	],
  	[
  		64914,
  		64967
  	],
  	[
  		65008,
  		65019
  	],
  	[
  		65021,
  		65021
  	],
  	[
  		65136,
  		65140
  	],
  	[
  		65142,
  		65276
  	],
  	[
  		65512,
  		65518
  	],
  	[
  		65536,
  		65547
  	],
  	[
  		65549,
  		65574
  	],
  	[
  		65576,
  		65594
  	],
  	[
  		65596,
  		65597
  	],
  	[
  		65599,
  		65613
  	],
  	[
  		65616,
  		65629
  	],
  	[
  		65664,
  		65786
  	],
  	[
  		65799,
  		65843
  	],
  	[
  		65847,
  		65934
  	],
  	[
  		65936,
  		65948
  	],
  	[
  		65952,
  		65952
  	],
  	[
  		66000,
  		66044
  	],
  	[
  		66176,
  		66204
  	],
  	[
  		66208,
  		66256
  	],
  	[
  		66273,
  		66299
  	],
  	[
  		66304,
  		66339
  	],
  	[
  		66349,
  		66378
  	],
  	[
  		66384,
  		66421
  	],
  	[
  		66432,
  		66461
  	],
  	[
  		66464,
  		66499
  	],
  	[
  		66504,
  		66511
  	],
  	[
  		66513,
  		66517
  	],
  	[
  		66560,
  		66717
  	],
  	[
  		66736,
  		66771
  	],
  	[
  		66776,
  		66811
  	],
  	[
  		66816,
  		66855
  	],
  	[
  		66864,
  		66915
  	],
  	[
  		66927,
  		66927
  	],
  	[
  		67072,
  		67382
  	],
  	[
  		67392,
  		67413
  	],
  	[
  		67424,
  		67431
  	],
  	[
  		67584,
  		67589
  	],
  	[
  		67592,
  		67592
  	],
  	[
  		67594,
  		67637
  	],
  	[
  		67639,
  		67640
  	],
  	[
  		67644,
  		67644
  	],
  	[
  		67647,
  		67669
  	],
  	[
  		67672,
  		67742
  	],
  	[
  		67751,
  		67759
  	],
  	[
  		67808,
  		67826
  	],
  	[
  		67828,
  		67829
  	],
  	[
  		67835,
  		67867
  	],
  	[
  		67872,
  		67897
  	],
  	[
  		67903,
  		67903
  	],
  	[
  		67968,
  		68023
  	],
  	[
  		68028,
  		68047
  	],
  	[
  		68050,
  		68096
  	],
  	[
  		68112,
  		68115
  	],
  	[
  		68117,
  		68119
  	],
  	[
  		68121,
  		68149
  	],
  	[
  		68160,
  		68168
  	],
  	[
  		68184,
  		68184
  	],
  	[
  		68192,
  		68255
  	],
  	[
  		68288,
  		68324
  	],
  	[
  		68331,
  		68335
  	],
  	[
  		68352,
  		68405
  	],
  	[
  		68416,
  		68437
  	],
  	[
  		68440,
  		68466
  	],
  	[
  		68472,
  		68497
  	],
  	[
  		68505,
  		68508
  	],
  	[
  		68521,
  		68527
  	],
  	[
  		68608,
  		68680
  	],
  	[
  		68736,
  		68786
  	],
  	[
  		68800,
  		68850
  	],
  	[
  		68858,
  		68899
  	],
  	[
  		69216,
  		69246
  	],
  	[
  		69248,
  		69289
  	],
  	[
  		69296,
  		69297
  	],
  	[
  		69376,
  		69415
  	],
  	[
  		69424,
  		69445
  	],
  	[
  		69457,
  		69465
  	],
  	[
  		69552,
  		69579
  	],
  	[
  		69600,
  		69622
  	],
  	[
  		69635,
  		69687
  	],
  	[
  		69705,
  		69709
  	],
  	[
  		69714,
  		69733
  	],
  	[
  		69763,
  		69807
  	],
  	[
  		69819,
  		69821
  	],
  	[
  		69837,
  		69837
  	],
  	[
  		69840,
  		69864
  	],
  	[
  		69891,
  		69926
  	],
  	[
  		69956,
  		69956
  	],
  	[
  		69959,
  		69959
  	],
  	[
  		69968,
  		70002
  	],
  	[
  		70004,
  		70004
  	],
  	[
  		70006,
  		70006
  	],
  	[
  		70019,
  		70066
  	],
  	[
  		70081,
  		70084
  	],
  	[
  		70087,
  		70087
  	],
  	[
  		70093,
  		70093
  	],
  	[
  		70106,
  		70106
  	],
  	[
  		70108,
  		70108
  	],
  	[
  		70113,
  		70132
  	],
  	[
  		70144,
  		70161
  	],
  	[
  		70163,
  		70187
  	],
  	[
  		70202,
  		70202
  	],
  	[
  		70205,
  		70205
  	],
  	[
  		70272,
  		70278
  	],
  	[
  		70280,
  		70280
  	],
  	[
  		70282,
  		70285
  	],
  	[
  		70287,
  		70301
  	],
  	[
  		70303,
  		70312
  	],
  	[
  		70320,
  		70366
  	],
  	[
  		70405,
  		70412
  	],
  	[
  		70415,
  		70416
  	],
  	[
  		70419,
  		70440
  	],
  	[
  		70442,
  		70448
  	],
  	[
  		70450,
  		70451
  	],
  	[
  		70453,
  		70457
  	],
  	[
  		70461,
  		70461
  	],
  	[
  		70480,
  		70480
  	],
  	[
  		70493,
  		70497
  	],
  	[
  		70656,
  		70708
  	],
  	[
  		70727,
  		70730
  	],
  	[
  		70735,
  		70735
  	],
  	[
  		70749,
  		70749
  	],
  	[
  		70751,
  		70753
  	],
  	[
  		70784,
  		70831
  	],
  	[
  		70852,
  		70855
  	],
  	[
  		71040,
  		71086
  	],
  	[
  		71110,
  		71112
  	],
  	[
  		71128,
  		71131
  	],
  	[
  		71168,
  		71215
  	],
  	[
  		71235,
  		71236
  	],
  	[
  		71296,
  		71338
  	],
  	[
  		71352,
  		71352
  	],
  	[
  		71680,
  		71723
  	],
  	[
  		71739,
  		71739
  	],
  	[
  		71840,
  		71903
  	],
  	[
  		71914,
  		71922
  	],
  	[
  		71935,
  		71942
  	],
  	[
  		71945,
  		71945
  	],
  	[
  		71948,
  		71955
  	],
  	[
  		71957,
  		71958
  	],
  	[
  		71960,
  		71983
  	],
  	[
  		71999,
  		71999
  	],
  	[
  		72001,
  		72001
  	],
  	[
  		72096,
  		72103
  	],
  	[
  		72106,
  		72144
  	],
  	[
  		72161,
  		72161
  	],
  	[
  		72163,
  		72163
  	],
  	[
  		72192,
  		72192
  	],
  	[
  		72203,
  		72242
  	],
  	[
  		72250,
  		72250
  	],
  	[
  		72256,
  		72256
  	],
  	[
  		72262,
  		72262
  	],
  	[
  		72272,
  		72272
  	],
  	[
  		72284,
  		72329
  	],
  	[
  		72349,
  		72349
  	],
  	[
  		72384,
  		72440
  	],
  	[
  		72704,
  		72712
  	],
  	[
  		72714,
  		72750
  	],
  	[
  		72768,
  		72768
  	],
  	[
  		72794,
  		72812
  	],
  	[
  		72818,
  		72847
  	],
  	[
  		72960,
  		72966
  	],
  	[
  		72968,
  		72969
  	],
  	[
  		72971,
  		73008
  	],
  	[
  		73030,
  		73030
  	],
  	[
  		73056,
  		73061
  	],
  	[
  		73063,
  		73064
  	],
  	[
  		73066,
  		73097
  	],
  	[
  		73112,
  		73112
  	],
  	[
  		73440,
  		73458
  	],
  	[
  		73463,
  		73464
  	],
  	[
  		73648,
  		73648
  	],
  	[
  		73664,
  		73692
  	],
  	[
  		73697,
  		73713
  	],
  	[
  		73728,
  		74649
  	],
  	[
  		74752,
  		74862
  	],
  	[
  		74880,
  		75075
  	],
  	[
  		77824,
  		78423
  	],
  	[
  		78430,
  		78465
  	],
  	[
  		78467,
  		78469
  	],
  	[
  		78474,
  		78712
  	],
  	[
  		78716,
  		78894
  	],
  	[
  		82944,
  		83405
  	],
  	[
  		83408,
  		83526
  	],
  	[
  		92160,
  		92728
  	],
  	[
  		92736,
  		92766
  	],
  	[
  		92880,
  		92909
  	],
  	[
  		92928,
  		92975
  	],
  	[
  		92986,
  		92995
  	],
  	[
  		92997,
  		92997
  	],
  	[
  		93019,
  		93025
  	],
  	[
  		93027,
  		93047
  	],
  	[
  		93053,
  		93071
  	],
  	[
  		93760,
  		93846
  	],
  	[
  		93849,
  		93850
  	],
  	[
  		93952,
  		94026
  	],
  	[
  		94032,
  		94032
  	],
  	[
  		94099,
  		94111
  	],
  	[
  		101120,
  		101589
  	],
  	[
  		113664,
  		113770
  	],
  	[
  		113776,
  		113788
  	],
  	[
  		113792,
  		113800
  	],
  	[
  		113808,
  		113817
  	],
  	[
  		113820,
  		113820
  	],
  	[
  		118784,
  		119029
  	],
  	[
  		119040,
  		119078
  	],
  	[
  		119081,
  		119140
  	],
  	[
  		119146,
  		119148
  	],
  	[
  		119171,
  		119172
  	],
  	[
  		119180,
  		119209
  	],
  	[
  		119214,
  		119272
  	],
  	[
  		119296,
  		119361
  	],
  	[
  		119365,
  		119365
  	],
  	[
  		119520,
  		119539
  	],
  	[
  		119552,
  		119638
  	],
  	[
  		119648,
  		119672
  	],
  	[
  		119808,
  		119892
  	],
  	[
  		119894,
  		119964
  	],
  	[
  		119966,
  		119967
  	],
  	[
  		119970,
  		119970
  	],
  	[
  		119973,
  		119974
  	],
  	[
  		119977,
  		119980
  	],
  	[
  		119982,
  		119993
  	],
  	[
  		119995,
  		119995
  	],
  	[
  		119997,
  		120003
  	],
  	[
  		120005,
  		120069
  	],
  	[
  		120071,
  		120074
  	],
  	[
  		120077,
  		120084
  	],
  	[
  		120086,
  		120092
  	],
  	[
  		120094,
  		120121
  	],
  	[
  		120123,
  		120126
  	],
  	[
  		120128,
  		120132
  	],
  	[
  		120134,
  		120134
  	],
  	[
  		120138,
  		120144
  	],
  	[
  		120146,
  		120485
  	],
  	[
  		120488,
  		120779
  	],
  	[
  		120832,
  		121343
  	],
  	[
  		121399,
  		121402
  	],
  	[
  		121453,
  		121460
  	],
  	[
  		121462,
  		121475
  	],
  	[
  		121477,
  		121478
  	],
  	[
  		121483,
  		121483
  	],
  	[
  		123136,
  		123180
  	],
  	[
  		123191,
  		123197
  	],
  	[
  		123214,
  		123215
  	],
  	[
  		123584,
  		123627
  	],
  	[
  		124928,
  		125124
  	],
  	[
  		125127,
  		125135
  	],
  	[
  		125184,
  		125251
  	],
  	[
  		125259,
  		125259
  	],
  	[
  		126065,
  		126123
  	],
  	[
  		126125,
  		126127
  	],
  	[
  		126129,
  		126132
  	],
  	[
  		126209,
  		126269
  	],
  	[
  		126464,
  		126467
  	],
  	[
  		126469,
  		126495
  	],
  	[
  		126497,
  		126498
  	],
  	[
  		126500,
  		126500
  	],
  	[
  		126503,
  		126503
  	],
  	[
  		126505,
  		126514
  	],
  	[
  		126516,
  		126519
  	],
  	[
  		126521,
  		126521
  	],
  	[
  		126523,
  		126523
  	],
  	[
  		126530,
  		126530
  	],
  	[
  		126535,
  		126535
  	],
  	[
  		126537,
  		126537
  	],
  	[
  		126539,
  		126539
  	],
  	[
  		126541,
  		126543
  	],
  	[
  		126545,
  		126546
  	],
  	[
  		126548,
  		126548
  	],
  	[
  		126551,
  		126551
  	],
  	[
  		126553,
  		126553
  	],
  	[
  		126555,
  		126555
  	],
  	[
  		126557,
  		126557
  	],
  	[
  		126559,
  		126559
  	],
  	[
  		126561,
  		126562
  	],
  	[
  		126564,
  		126564
  	],
  	[
  		126567,
  		126570
  	],
  	[
  		126572,
  		126578
  	],
  	[
  		126580,
  		126583
  	],
  	[
  		126585,
  		126588
  	],
  	[
  		126590,
  		126590
  	],
  	[
  		126592,
  		126601
  	],
  	[
  		126603,
  		126619
  	],
  	[
  		126625,
  		126627
  	],
  	[
  		126629,
  		126633
  	],
  	[
  		126635,
  		126651
  	],
  	[
  		126704,
  		126705
  	],
  	[
  		127278,
  		127279
  	],
  	[
  		127338,
  		127340
  	],
  	[
  		127900,
  		127901
  	],
  	[
  		127925,
  		127926
  	],
  	[
  		127932,
  		127932
  	],
  	[
  		128160,
  		128160
  	],
  	[
  		128162,
  		128162
  	],
  	[
  		128164,
  		128164
  	],
  	[
  		128175,
  		128175
  	],
  	[
  		128177,
  		128178
  	],
  	[
  		128256,
  		128262
  	],
  	[
  		128279,
  		128292
  	],
  	[
  		128306,
  		128329
  	],
  	[
  		128468,
  		128475
  	],
  	[
  		128500,
  		128505
  	],
  	[
  		128592,
  		128629
  	],
  	[
  		128636,
  		128639
  	],
  	[
  		128768,
  		128883
  	],
  	[
  		128896,
  		128980
  	],
  	[
  		129024,
  		129035
  	],
  	[
  		129040,
  		129095
  	],
  	[
  		129104,
  		129113
  	],
  	[
  		129120,
  		129159
  	],
  	[
  		129168,
  		129197
  	],
  	[
  		129280,
  		129291
  	],
  	[
  		129536,
  		129619
  	],
  	[
  		129792,
  		129938
  	],
  	[
  		129940,
  		129994
  	]
  ],
  	"Line_Break/Quotation": [
  	[
  		34,
  		34
  	],
  	[
  		39,
  		39
  	],
  	[
  		171,
  		171
  	],
  	[
  		187,
  		187
  	],
  	[
  		8216,
  		8217
  	],
  	[
  		8219,
  		8221
  	],
  	[
  		8223,
  		8223
  	],
  	[
  		8249,
  		8250
  	],
  	[
  		10075,
  		10080
  	],
  	[
  		11776,
  		11789
  	],
  	[
  		11804,
  		11805
  	],
  	[
  		11808,
  		11809
  	],
  	[
  		128630,
  		128632
  	]
  ],
  	"Line_Break/Break_Before": [
  	[
  		180,
  		180
  	],
  	[
  		712,
  		712
  	],
  	[
  		716,
  		716
  	],
  	[
  		735,
  		735
  	],
  	[
  		3191,
  		3191
  	],
  	[
  		3204,
  		3204
  	],
  	[
  		3841,
  		3844
  	],
  	[
  		3846,
  		3847
  	],
  	[
  		3849,
  		3850
  	],
  	[
  		4048,
  		4049
  	],
  	[
  		4051,
  		4051
  	],
  	[
  		6150,
  		6150
  	],
  	[
  		8189,
  		8189
  	],
  	[
  		43124,
  		43125
  	],
  	[
  		43260,
  		43260
  	],
  	[
  		70005,
  		70005
  	],
  	[
  		70107,
  		70107
  	],
  	[
  		71105,
  		71105
  	],
  	[
  		71264,
  		71276
  	],
  	[
  		72162,
  		72162
  	],
  	[
  		72255,
  		72255
  	],
  	[
  		72261,
  		72261
  	],
  	[
  		72350,
  		72352
  	],
  	[
  		72816,
  		72816
  	]
  ],
  	"Line_Break/Line_Feed": [
  	[
  		10,
  		10
  	]
  ],
  	"Line_Break/Open_Punctuation": [
  	[
  		40,
  		40
  	],
  	[
  		91,
  		91
  	],
  	[
  		123,
  		123
  	],
  	[
  		161,
  		161
  	],
  	[
  		191,
  		191
  	],
  	[
  		3898,
  		3898
  	],
  	[
  		3900,
  		3900
  	],
  	[
  		5787,
  		5787
  	],
  	[
  		8218,
  		8218
  	],
  	[
  		8222,
  		8222
  	],
  	[
  		8261,
  		8261
  	],
  	[
  		8317,
  		8317
  	],
  	[
  		8333,
  		8333
  	],
  	[
  		8968,
  		8968
  	],
  	[
  		8970,
  		8970
  	],
  	[
  		9001,
  		9001
  	],
  	[
  		10088,
  		10088
  	],
  	[
  		10090,
  		10090
  	],
  	[
  		10092,
  		10092
  	],
  	[
  		10094,
  		10094
  	],
  	[
  		10096,
  		10096
  	],
  	[
  		10098,
  		10098
  	],
  	[
  		10100,
  		10100
  	],
  	[
  		10181,
  		10181
  	],
  	[
  		10214,
  		10214
  	],
  	[
  		10216,
  		10216
  	],
  	[
  		10218,
  		10218
  	],
  	[
  		10220,
  		10220
  	],
  	[
  		10222,
  		10222
  	],
  	[
  		10627,
  		10627
  	],
  	[
  		10629,
  		10629
  	],
  	[
  		10631,
  		10631
  	],
  	[
  		10633,
  		10633
  	],
  	[
  		10635,
  		10635
  	],
  	[
  		10637,
  		10637
  	],
  	[
  		10639,
  		10639
  	],
  	[
  		10641,
  		10641
  	],
  	[
  		10643,
  		10643
  	],
  	[
  		10645,
  		10645
  	],
  	[
  		10647,
  		10647
  	],
  	[
  		10712,
  		10712
  	],
  	[
  		10714,
  		10714
  	],
  	[
  		10748,
  		10748
  	],
  	[
  		11800,
  		11800
  	],
  	[
  		11810,
  		11810
  	],
  	[
  		11812,
  		11812
  	],
  	[
  		11814,
  		11814
  	],
  	[
  		11816,
  		11816
  	],
  	[
  		11842,
  		11842
  	],
  	[
  		12296,
  		12296
  	],
  	[
  		12298,
  		12298
  	],
  	[
  		12300,
  		12300
  	],
  	[
  		12302,
  		12302
  	],
  	[
  		12304,
  		12304
  	],
  	[
  		12308,
  		12308
  	],
  	[
  		12310,
  		12310
  	],
  	[
  		12312,
  		12312
  	],
  	[
  		12314,
  		12314
  	],
  	[
  		12317,
  		12317
  	],
  	[
  		64831,
  		64831
  	],
  	[
  		65047,
  		65047
  	],
  	[
  		65077,
  		65077
  	],
  	[
  		65079,
  		65079
  	],
  	[
  		65081,
  		65081
  	],
  	[
  		65083,
  		65083
  	],
  	[
  		65085,
  		65085
  	],
  	[
  		65087,
  		65087
  	],
  	[
  		65089,
  		65089
  	],
  	[
  		65091,
  		65091
  	],
  	[
  		65095,
  		65095
  	],
  	[
  		65113,
  		65113
  	],
  	[
  		65115,
  		65115
  	],
  	[
  		65117,
  		65117
  	],
  	[
  		65288,
  		65288
  	],
  	[
  		65339,
  		65339
  	],
  	[
  		65371,
  		65371
  	],
  	[
  		65375,
  		65375
  	],
  	[
  		65378,
  		65378
  	],
  	[
  		78424,
  		78426
  	],
  	[
  		78470,
  		78470
  	],
  	[
  		78472,
  		78472
  	],
  	[
  		78713,
  		78713
  	],
  	[
  		78903,
  		78903
  	],
  	[
  		83406,
  		83406
  	],
  	[
  		125278,
  		125279
  	]
  ],
  	"Block/Georgian_Supplement": [
  	[
  		11520,
  		11567
  	]
  ],
  	"Block/Phoenician": [
  	[
  		67840,
  		67871
  	]
  ],
  	"Block/CJK_Unified_Ideographs_Extension_E": [
  	[
  		178208,
  		183983
  	]
  ],
  	"Block/Hangul_Jamo_Extended_A": [
  	[
  		43360,
  		43391
  	]
  ],
  	"Block/Nabataean": [
  	[
  		67712,
  		67759
  	]
  ],
  	"Block/Mandaic": [
  	[
  		2112,
  		2143
  	]
  ],
  	"Block/Meroitic_Hieroglyphs": [
  	[
  		67968,
  		67999
  	]
  ],
  	"Block/Meetei_Mayek_Extensions": [
  	[
  		43744,
  		43775
  	]
  ],
  	"Block/Ethiopic_Extended_A": [
  	[
  		43776,
  		43823
  	]
  ],
  	"Block/Avestan": [
  	[
  		68352,
  		68415
  	]
  ],
  	"Block/Batak": [
  	[
  		7104,
  		7167
  	]
  ],
  	"Block/Cypriot_Syllabary": [
  	[
  		67584,
  		67647
  	]
  ],
  	"Block/Mathematical_Operators": [
  	[
  		8704,
  		8959
  	]
  ],
  	"Block/Mro": [
  	[
  		92736,
  		92783
  	]
  ],
  	"Block/CJK_Compatibility_Forms": [
  	[
  		65072,
  		65103
  	]
  ],
  	"Block/Sharada": [
  	[
  		70016,
  		70111
  	]
  ],
  	"Block/Tagbanwa": [
  	[
  		5984,
  		6015
  	]
  ],
  	"Block/Ethiopic_Extended": [
  	[
  		11648,
  		11743
  	]
  ],
  	"Block/NKo": [
  	[
  		1984,
  		2047
  	]
  ],
  	"Block/Kangxi_Radicals": [
  	[
  		12032,
  		12255
  	]
  ],
  	"Block/Supplementary_Private_Use_Area_A": [
  	[
  		983040,
  		1048575
  	]
  ],
  	"Block/CJK_Symbols_And_Punctuation": [
  	[
  		12288,
  		12351
  	]
  ],
  	"Block/Old_Permic": [
  	[
  		66384,
  		66431
  	]
  ],
  	"Block/IPA_Extensions": [
  	[
  		592,
  		687
  	]
  ],
  	"Block/Vertical_Forms": [
  	[
  		65040,
  		65055
  	]
  ],
  	"Block/Spacing_Modifier_Letters": [
  	[
  		688,
  		767
  	]
  ],
  	"Block/Low_Surrogates": [
  	[
  		56320,
  		57343
  	]
  ],
  	"Block/Warang_Citi": [
  	[
  		71840,
  		71935
  	]
  ],
  	"Block/Mahajani": [
  	[
  		69968,
  		70015
  	]
  ],
  	"Block/Rejang": [
  	[
  		43312,
  		43359
  	]
  ],
  	"Block/Ogham": [
  	[
  		5760,
  		5791
  	]
  ],
  	"Block/Thai": [
  	[
  		3584,
  		3711
  	]
  ],
  	"Block/Ancient_Symbols": [
  	[
  		65936,
  		65999
  	]
  ],
  	"Block/Devanagari_Extended": [
  	[
  		43232,
  		43263
  	]
  ],
  	"Block/Emoticons": [
  	[
  		128512,
  		128591
  	]
  ],
  	"Block/Tangut": [
  	[
  		94208,
  		100351
  	]
  ],
  	"Block/Bhaiksuki": [
  	[
  		72704,
  		72815
  	]
  ],
  	"Block/Phonetic_Extensions_Supplement": [
  	[
  		7552,
  		7615
  	]
  ],
  	"Block/Runic": [
  	[
  		5792,
  		5887
  	]
  ],
  	"Block/High_Surrogates": [
  	[
  		55296,
  		56191
  	]
  ],
  	"Block/Syriac_Supplement": [
  	[
  		2144,
  		2159
  	]
  ],
  	"Block/Sora_Sompeng": [
  	[
  		69840,
  		69887
  	]
  ],
  	"Block/Kana_Supplement": [
  	[
  		110592,
  		110847
  	]
  ],
  	"Block/Arrows": [
  	[
  		8592,
  		8703
  	]
  ],
  	"Block/Early_Dynastic_Cuneiform": [
  	[
  		74880,
  		75087
  	]
  ],
  	"Block/Samaritan": [
  	[
  		2048,
  		2111
  	]
  ],
  	"Block/Cyrillic_Supplement": [
  	[
  		1280,
  		1327
  	]
  ],
  	"Block/Playing_Cards": [
  	[
  		127136,
  		127231
  	]
  ],
  	"Block/Newa": [
  	[
  		70656,
  		70783
  	]
  ],
  	"Block/Alphabetic_Presentation_Forms": [
  	[
  		64256,
  		64335
  	]
  ],
  	"Block/Limbu": [
  	[
  		6400,
  		6479
  	]
  ],
  	"Block/Mathematical_Alphanumeric_Symbols": [
  	[
  		119808,
  		120831
  	]
  ],
  	"Block/Dingbats": [
  	[
  		9984,
  		10175
  	]
  ],
  	"Block/CJK_Unified_Ideographs": [
  	[
  		19968,
  		40959
  	]
  ],
  	"Block/Osage": [
  	[
  		66736,
  		66815
  	]
  ],
  	"Block/Old_Sogdian": [
  	[
  		69376,
  		69423
  	]
  ],
  	"Block/Imperial_Aramaic": [
  	[
  		67648,
  		67679
  	]
  ],
  	"Block/CJK_Radicals_Supplement": [
  	[
  		11904,
  		12031
  	]
  ],
  	"Block/Meroitic_Cursive": [
  	[
  		68000,
  		68095
  	]
  ],
  	"Block/Kharoshthi": [
  	[
  		68096,
  		68191
  	]
  ],
  	"Block/New_Tai_Lue": [
  	[
  		6528,
  		6623
  	]
  ],
  	"Block/Tagalog": [
  	[
  		5888,
  		5919
  	]
  ],
  	"Block/Cyrillic_Extended_C": [
  	[
  		7296,
  		7311
  	]
  ],
  	"Block/Myanmar_Extended_A": [
  	[
  		43616,
  		43647
  	]
  ],
  	"Block/Glagolitic_Supplement": [
  	[
  		122880,
  		122927
  	]
  ],
  	"Block/Latin_Extended_D": [
  	[
  		42784,
  		43007
  	]
  ],
  	"Block/Phaistos_Disc": [
  	[
  		66000,
  		66047
  	]
  ],
  	"Block/Georgian_Extended": [
  	[
  		7312,
  		7359
  	]
  ],
  	"Block/Ancient_Greek_Numbers": [
  	[
  		65856,
  		65935
  	]
  ],
  	"Block/Georgian": [
  	[
  		4256,
  		4351
  	]
  ],
  	"Block/Balinese": [
  	[
  		6912,
  		7039
  	]
  ],
  	"Block/Kannada": [
  	[
  		3200,
  		3327
  	]
  ],
  	"Block/Tai_Le": [
  	[
  		6480,
  		6527
  	]
  ],
  	"Block/Chakma": [
  	[
  		69888,
  		69967
  	]
  ],
  	"Block/Supplemental_Arrows_C": [
  	[
  		129024,
  		129279
  	]
  ],
  	"Block/Number_Forms": [
  	[
  		8528,
  		8591
  	]
  ],
  	"Block/Arabic": [
  	[
  		1536,
  		1791
  	]
  ],
  	"Block/Sinhala_Archaic_Numbers": [
  	[
  		70112,
  		70143
  	]
  ],
  	"Block/General_Punctuation": [
  	[
  		8192,
  		8303
  	]
  ],
  	"Block/Supplemental_Arrows_B": [
  	[
  		10496,
  		10623
  	]
  ],
  	"Block/Enclosed_Ideographic_Supplement": [
  	[
  		127488,
  		127743
  	]
  ],
  	"Block/Gothic": [
  	[
  		66352,
  		66383
  	]
  ],
  	"Block/Combining_Diacritical_Marks_Extended": [
  	[
  		6832,
  		6911
  	]
  ],
  	"Block/Miscellaneous_Mathematical_Symbols_A": [
  	[
  		10176,
  		10223
  	]
  ],
  	"Block/Phonetic_Extensions": [
  	[
  		7424,
  		7551
  	]
  ],
  	"Block/Hangul_Jamo": [
  	[
  		4352,
  		4607
  	]
  ],
  	"Block/Khmer": [
  	[
  		6016,
  		6143
  	]
  ],
  	"Block/Old_North_Arabian": [
  	[
  		68224,
  		68255
  	]
  ],
  	"Block/CJK_Unified_Ideographs_Extension_C": [
  	[
  		173824,
  		177983
  	]
  ],
  	"Block/Ornamental_Dingbats": [
  	[
  		128592,
  		128639
  	]
  ],
  	"Block/Hiragana": [
  	[
  		12352,
  		12447
  	]
  ],
  	"Block/Khojki": [
  	[
  		70144,
  		70223
  	]
  ],
  	"Block/Palmyrene": [
  	[
  		67680,
  		67711
  	]
  ],
  	"Block/Bassa_Vah": [
  	[
  		92880,
  		92927
  	]
  ],
  	"Block/Braille_Patterns": [
  	[
  		10240,
  		10495
  	]
  ],
  	"Block/Aegean_Numbers": [
  	[
  		65792,
  		65855
  	]
  ],
  	"Block/Private_Use_Area": [
  	[
  		57344,
  		63743
  	]
  ],
  	"Block/Katakana_Phonetic_Extensions": [
  	[
  		12784,
  		12799
  	]
  ],
  	"Block/Linear_A": [
  	[
  		67072,
  		67455
  	]
  ],
  	"Block/Armenian": [
  	[
  		1328,
  		1423
  	]
  ],
  	"Block/Letterlike_Symbols": [
  	[
  		8448,
  		8527
  	]
  ],
  	"Block/Old_Italic": [
  	[
  		66304,
  		66351
  	]
  ],
  	"Block/Caucasian_Albanian": [
  	[
  		66864,
  		66927
  	]
  ],
  	"Block/Halfwidth_And_Fullwidth_Forms": [
  	[
  		65280,
  		65519
  	]
  ],
  	"Block/Modi": [
  	[
  		71168,
  		71263
  	]
  ],
  	"Block/Takri": [
  	[
  		71296,
  		71375
  	]
  ],
  	"Block/Mende_Kikakui": [
  	[
  		124928,
  		125151
  	]
  ],
  	"Block/Box_Drawing": [
  	[
  		9472,
  		9599
  	]
  ],
  	"Block/Transport_And_Map_Symbols": [
  	[
  		128640,
  		128767
  	]
  ],
  	"Block/Hebrew": [
  	[
  		1424,
  		1535
  	]
  ],
  	"Block/Arabic_Extended_A": [
  	[
  		2208,
  		2303
  	]
  ],
  	"Block/Lepcha": [
  	[
  		7168,
  		7247
  	]
  ],
  	"Block/Supplemental_Mathematical_Operators": [
  	[
  		10752,
  		11007
  	]
  ],
  	"Block/Phags_Pa": [
  	[
  		43072,
  		43135
  	]
  ],
  	"Block/Enclosed_CJK_Letters_And_Months": [
  	[
  		12800,
  		13055
  	]
  ],
  	"Block/Lydian": [
  	[
  		67872,
  		67903
  	]
  ],
  	"Block/Vedic_Extensions": [
  	[
  		7376,
  		7423
  	]
  ],
  	"Block/Combining_Half_Marks": [
  	[
  		65056,
  		65071
  	]
  ],
  	"Block/Buginese": [
  	[
  		6656,
  		6687
  	]
  ],
  	"Block/Saurashtra": [
  	[
  		43136,
  		43231
  	]
  ],
  	"Block/Hanifi_Rohingya": [
  	[
  		68864,
  		68927
  	]
  ],
  	"Block/Glagolitic": [
  	[
  		11264,
  		11359
  	]
  ],
  	"Block/Arabic_Presentation_Forms_A": [
  	[
  		64336,
  		65023
  	]
  ],
  	"Block/Khmer_Symbols": [
  	[
  		6624,
  		6655
  	]
  ],
  	"Block/High_Private_Use_Surrogates": [
  	[
  		56192,
  		56319
  	]
  ],
  	"Block/Cuneiform_Numbers_And_Punctuation": [
  	[
  		74752,
  		74879
  	]
  ],
  	"Block/Cyrillic_Extended_A": [
  	[
  		11744,
  		11775
  	]
  ],
  	"Block/Sinhala": [
  	[
  		3456,
  		3583
  	]
  ],
  	"Block/Arabic_Supplement": [
  	[
  		1872,
  		1919
  	]
  ],
  	"Block/Myanmar_Extended_B": [
  	[
  		43488,
  		43519
  	]
  ],
  	"Block/Coptic": [
  	[
  		11392,
  		11519
  	]
  ],
  	"Block/Bamum_Supplement": [
  	[
  		92160,
  		92735
  	]
  ],
  	"Block/Inscriptional_Pahlavi": [
  	[
  		68448,
  		68479
  	]
  ],
  	"Block/Common_Indic_Number_Forms": [
  	[
  		43056,
  		43071
  	]
  ],
  	"Block/Hanunoo": [
  	[
  		5920,
  		5951
  	]
  ],
  	"Block/Cham": [
  	[
  		43520,
  		43615
  	]
  ],
  	"Block/Pahawh_Hmong": [
  	[
  		92928,
  		93071
  	]
  ],
  	"Block/Latin_Extended_Additional": [
  	[
  		7680,
  		7935
  	]
  ],
  	"Block/Deseret": [
  	[
  		66560,
  		66639
  	]
  ],
  	"Block/Shavian": [
  	[
  		66640,
  		66687
  	]
  ],
  	"Block/Latin_1_Supplement": [
  	[
  		128,
  		255
  	]
  ],
  	"Block/Variation_Selectors_Supplement": [
  	[
  		917760,
  		917999
  	]
  ],
  	"Block/Syloti_Nagri": [
  	[
  		43008,
  		43055
  	]
  ],
  	"Block/Marchen": [
  	[
  		72816,
  		72895
  	]
  ],
  	"Block/Brahmi": [
  	[
  		69632,
  		69759
  	]
  ],
  	"Block/Cyrillic_Extended_B": [
  	[
  		42560,
  		42655
  	]
  ],
  	"Block/Buhid": [
  	[
  		5952,
  		5983
  	]
  ],
  	"Block/Tamil": [
  	[
  		2944,
  		3071
  	]
  ],
  	"Block/Masaram_Gondi": [
  	[
  		72960,
  		73055
  	]
  ],
  	"Block/Tangut_Components": [
  	[
  		100352,
  		101119
  	]
  ],
  	"Block/Unified_Canadian_Aboriginal_Syllabics_Extended": [
  	[
  		6320,
  		6399
  	]
  ],
  	"Block/Yi_Radicals": [
  	[
  		42128,
  		42191
  	]
  ],
  	"Block/CJK_Unified_Ideographs_Extension_D": [
  	[
  		177984,
  		178207
  	]
  ],
  	"Block/Siddham": [
  	[
  		71040,
  		71167
  	]
  ],
  	"Block/Cyrillic": [
  	[
  		1024,
  		1279
  	]
  ],
  	"Block/Supplementary_Private_Use_Area_B": [
  	[
  		1048576,
  		1114111
  	]
  ],
  	"Block/Arabic_Presentation_Forms_B": [
  	[
  		65136,
  		65279
  	]
  ],
  	"Block/Medefaidrin": [
  	[
  		93760,
  		93855
  	]
  ],
  	"Block/Miscellaneous_Symbols_And_Arrows": [
  	[
  		11008,
  		11263
  	]
  ],
  	"Block/Tai_Xuan_Jing_Symbols": [
  	[
  		119552,
  		119647
  	]
  ],
  	"Block/Ideographic_Description_Characters": [
  	[
  		12272,
  		12287
  	]
  ],
  	"Block/Ol_Chiki": [
  	[
  		7248,
  		7295
  	]
  ],
  	"Block/Duployan": [
  	[
  		113664,
  		113823
  	]
  ],
  	"Block/Block_Elements": [
  	[
  		9600,
  		9631
  	]
  ],
  	"Block/Sogdian": [
  	[
  		69424,
  		69487
  	]
  ],
  	"Block/Rumi_Numeral_Symbols": [
  	[
  		69216,
  		69247
  	]
  ],
  	"Block/Javanese": [
  	[
  		43392,
  		43487
  	]
  ],
  	"Block/Lao": [
  	[
  		3712,
  		3839
  	]
  ],
  	"Block/Cherokee_Supplement": [
  	[
  		43888,
  		43967
  	]
  ],
  	"Block/Mongolian_Supplement": [
  	[
  		71264,
  		71295
  	]
  ],
  	"Block/Egyptian_Hieroglyphs": [
  	[
  		77824,
  		78895
  	]
  ],
  	"Block/Soyombo": [
  	[
  		72272,
  		72367
  	]
  ],
  	"Block/Linear_B_Ideograms": [
  	[
  		65664,
  		65791
  	]
  ],
  	"Block/Nushu": [
  	[
  		110960,
  		111359
  	]
  ],
  	"Block/undefined": [
  	[
  		69248,
  		69311
  	],
  	[
  		69552,
  		69631
  	],
  	[
  		71936,
  		72031
  	],
  	[
  		72096,
  		72191
  	],
  	[
  		73648,
  		73727
  	],
  	[
  		78896,
  		78911
  	],
  	[
  		101120,
  		101775
  	],
  	[
  		110896,
  		110959
  	],
  	[
  		123136,
  		123215
  	],
  	[
  		123584,
  		123647
  	],
  	[
  		126208,
  		126287
  	],
  	[
  		129648,
  		130047
  	],
  	[
  		196608,
  		201551
  	]
  ],
  	"Block/Oriya": [
  	[
  		2816,
  		2943
  	]
  ],
  	"Block/Currency_Symbols": [
  	[
  		8352,
  		8399
  	]
  ],
  	"Block/Bopomofo": [
  	[
  		12544,
  		12591
  	]
  ],
  	"Block/Ancient_Greek_Musical_Notation": [
  	[
  		119296,
  		119375
  	]
  ],
  	"Block/Myanmar": [
  	[
  		4096,
  		4255
  	]
  ],
  	"Block/Multani": [
  	[
  		70272,
  		70319
  	]
  ],
  	"Block/Chess_Symbols": [
  	[
  		129536,
  		129647
  	]
  ],
  	"Block/Kanbun": [
  	[
  		12688,
  		12703
  	]
  ],
  	"Block/Gujarati": [
  	[
  		2688,
  		2815
  	]
  ],
  	"Block/Tibetan": [
  	[
  		3840,
  		4095
  	]
  ],
  	"Block/Hatran": [
  	[
  		67808,
  		67839
  	]
  ],
  	"Block/Alchemical_Symbols": [
  	[
  		128768,
  		128895
  	]
  ],
  	"Block/Unified_Canadian_Aboriginal_Syllabics": [
  	[
  		5120,
  		5759
  	]
  ],
  	"Block/Kayah_Li": [
  	[
  		43264,
  		43311
  	]
  ],
  	"Block/Miscellaneous_Mathematical_Symbols_B": [
  	[
  		10624,
  		10751
  	]
  ],
  	"Block/CJK_Unified_Ideographs_Extension_F": [
  	[
  		183984,
  		191471
  	]
  ],
  	"Block/Malayalam": [
  	[
  		3328,
  		3455
  	]
  ],
  	"Block/Enclosed_Alphanumeric_Supplement": [
  	[
  		127232,
  		127487
  	]
  ],
  	"Block/Geometric_Shapes": [
  	[
  		9632,
  		9727
  	]
  ],
  	"Block/Latin_Extended_A": [
  	[
  		256,
  		383
  	]
  ],
  	"Block/Makasar": [
  	[
  		73440,
  		73471
  	]
  ],
  	"Block/Gurmukhi": [
  	[
  		2560,
  		2687
  	]
  ],
  	"Block/CJK_Unified_Ideographs_Extension_B": [
  	[
  		131072,
  		173791
  	]
  ],
  	"Block/Cuneiform": [
  	[
  		73728,
  		74751
  	]
  ],
  	"Block/Latin_Extended_C": [
  	[
  		11360,
  		11391
  	]
  ],
  	"Block/Latin_Extended_E": [
  	[
  		43824,
  		43887
  	]
  ],
  	"Block/Hangul_Compatibility_Jamo": [
  	[
  		12592,
  		12687
  	]
  ],
  	"Block/Miscellaneous_Symbols_And_Pictographs": [
  	[
  		127744,
  		128511
  	]
  ],
  	"Block/Pau_Cin_Hau": [
  	[
  		72384,
  		72447
  	]
  ],
  	"Block/Miscellaneous_Symbols": [
  	[
  		9728,
  		9983
  	]
  ],
  	"Block/Latin_Extended_B": [
  	[
  		384,
  		591
  	]
  ],
  	"Block/CJK_Unified_Ideographs_Extension_A": [
  	[
  		13312,
  		19903
  	]
  ],
  	"Block/Byzantine_Musical_Symbols": [
  	[
  		118784,
  		119039
  	]
  ],
  	"Block/Grantha": [
  	[
  		70400,
  		70527
  	]
  ],
  	"Block/Cherokee": [
  	[
  		5024,
  		5119
  	]
  ],
  	"Block/Devanagari": [
  	[
  		2304,
  		2431
  	]
  ],
  	"Block/Supplemental_Arrows_A": [
  	[
  		10224,
  		10239
  	]
  ],
  	"Block/Katakana": [
  	[
  		12448,
  		12543
  	]
  ],
  	"Block/Optical_Character_Recognition": [
  	[
  		9280,
  		9311
  	]
  ],
  	"Block/CJK_Compatibility_Ideographs": [
  	[
  		63744,
  		64255
  	]
  ],
  	"Block/Gunjala_Gondi": [
  	[
  		73056,
  		73135
  	]
  ],
  	"Block/Bengali": [
  	[
  		2432,
  		2559
  	]
  ],
  	"Block/Indic_Siyaq_Numbers": [
  	[
  		126064,
  		126143
  	]
  ],
  	"Block/Linear_B_Syllabary": [
  	[
  		65536,
  		65663
  	]
  ],
  	"Block/Yi_Syllables": [
  	[
  		40960,
  		42127
  	]
  ],
  	"Block/Vai": [
  	[
  		42240,
  		42559
  	]
  ],
  	"Block/Sundanese_Supplement": [
  	[
  		7360,
  		7375
  	]
  ],
  	"Block/Mongolian": [
  	[
  		6144,
  		6319
  	]
  ],
  	"Block/Combining_Diacritical_Marks_Supplement": [
  	[
  		7616,
  		7679
  	]
  ],
  	"Block/Old_Hungarian": [
  	[
  		68736,
  		68863
  	]
  ],
  	"Block/Anatolian_Hieroglyphs": [
  	[
  		82944,
  		83583
  	]
  ],
  	"Block/Control_Pictures": [
  	[
  		9216,
  		9279
  	]
  ],
  	"Block/Miscellaneous_Technical": [
  	[
  		8960,
  		9215
  	]
  ],
  	"Block/Lisu": [
  	[
  		42192,
  		42239
  	]
  ],
  	"Block/Geometric_Shapes_Extended": [
  	[
  		128896,
  		129023
  	]
  ],
  	"Block/Old_South_Arabian": [
  	[
  		68192,
  		68223
  	]
  ],
  	"Block/Mayan_Numerals": [
  	[
  		119520,
  		119551
  	]
  ],
  	"Block/CJK_Strokes": [
  	[
  		12736,
  		12783
  	]
  ],
  	"Block/Coptic_Epact_Numbers": [
  	[
  		66272,
  		66303
  	]
  ],
  	"Block/Enclosed_Alphanumerics": [
  	[
  		9312,
  		9471
  	]
  ],
  	"Block/CJK_Compatibility": [
  	[
  		13056,
  		13311
  	]
  ],
  	"Block/Ethiopic_Supplement": [
  	[
  		4992,
  		5023
  	]
  ],
  	"Block/Tags": [
  	[
  		917504,
  		917631
  	]
  ],
  	"Block/Carian": [
  	[
  		66208,
  		66271
  	]
  ],
  	"Block/Mahjong_Tiles": [
  	[
  		126976,
  		127023
  	]
  ],
  	"Block/Ahom": [
  	[
  		71424,
  		71487
  	]
  ],
  	"Block/Tirhuta": [
  	[
  		70784,
  		70879
  	]
  ],
  	"Block/Arabic_Mathematical_Alphabetic_Symbols": [
  	[
  		126464,
  		126719
  	]
  ],
  	"Block/Hangul_Jamo_Extended_B": [
  	[
  		55216,
  		55295
  	]
  ],
  	"Block/CJK_Compatibility_Ideographs_Supplement": [
  	[
  		194560,
  		195103
  	]
  ],
  	"Block/Bopomofo_Extended": [
  	[
  		12704,
  		12735
  	]
  ],
  	"Block/Ethiopic": [
  	[
  		4608,
  		4991
  	]
  ],
  	"Block/Combining_Diacritical_Marks": [
  	[
  		768,
  		879
  	]
  ],
  	"Block/Old_Persian": [
  	[
  		66464,
  		66527
  	]
  ],
  	"Block/Hangul_Syllables": [
  	[
  		44032,
  		55215
  	]
  ],
  	"Block/Counting_Rod_Numerals": [
  	[
  		119648,
  		119679
  	]
  ],
  	"Block/Miao": [
  	[
  		93952,
  		94111
  	]
  ],
  	"Block/Tifinagh": [
  	[
  		11568,
  		11647
  	]
  ],
  	"Block/Psalter_Pahlavi": [
  	[
  		68480,
  		68527
  	]
  ],
  	"Block/Adlam": [
  	[
  		125184,
  		125279
  	]
  ],
  	"Block/Yijing_Hexagram_Symbols": [
  	[
  		19904,
  		19967
  	]
  ],
  	"Block/Elbasan": [
  	[
  		66816,
  		66863
  	]
  ],
  	"Block/Modifier_Tone_Letters": [
  	[
  		42752,
  		42783
  	]
  ],
  	"Block/Tai_Tham": [
  	[
  		6688,
  		6831
  	]
  ],
  	"Block/Tai_Viet": [
  	[
  		43648,
  		43743
  	]
  ],
  	"Block/Ideographic_Symbols_And_Punctuation": [
  	[
  		94176,
  		94207
  	]
  ],
  	"Block/Domino_Tiles": [
  	[
  		127024,
  		127135
  	]
  ],
  	"Block/Basic_Latin": [
  	[
  		0,
  		127
  	]
  ],
  	"Block/Combining_Diacritical_Marks_For_Symbols": [
  	[
  		8400,
  		8447
  	]
  ],
  	"Block/Sutton_SignWriting": [
  	[
  		120832,
  		121519
  	]
  ],
  	"Block/Meetei_Mayek": [
  	[
  		43968,
  		44031
  	]
  ],
  	"Block/Sundanese": [
  	[
  		7040,
  		7103
  	]
  ],
  	"Block/Kana_Extended_A": [
  	[
  		110848,
  		110895
  	]
  ],
  	"Block/Small_Form_Variants": [
  	[
  		65104,
  		65135
  	]
  ],
  	"Block/Syriac": [
  	[
  		1792,
  		1871
  	]
  ],
  	"Block/Inscriptional_Parthian": [
  	[
  		68416,
  		68447
  	]
  ],
  	"Block/Old_Turkic": [
  	[
  		68608,
  		68687
  	]
  ],
  	"Block/Variation_Selectors": [
  	[
  		65024,
  		65039
  	]
  ],
  	"Block/Specials": [
  	[
  		65520,
  		65535
  	]
  ],
  	"Block/Lycian": [
  	[
  		66176,
  		66207
  	]
  ],
  	"Block/Manichaean": [
  	[
  		68288,
  		68351
  	]
  ],
  	"Block/Musical_Symbols": [
  	[
  		119040,
  		119295
  	]
  ],
  	"Block/Khudawadi": [
  	[
  		70320,
  		70399
  	]
  ],
  	"Block/Ugaritic": [
  	[
  		66432,
  		66463
  	]
  ],
  	"Block/Bamum": [
  	[
  		42656,
  		42751
  	]
  ],
  	"Block/Superscripts_And_Subscripts": [
  	[
  		8304,
  		8351
  	]
  ],
  	"Block/Thaana": [
  	[
  		1920,
  		1983
  	]
  ],
  	"Block/Osmanya": [
  	[
  		66688,
  		66735
  	]
  ],
  	"Block/Zanabazar_Square": [
  	[
  		72192,
  		72271
  	]
  ],
  	"Block/Shorthand_Format_Controls": [
  	[
  		113824,
  		113839
  	]
  ],
  	"Block/Greek_And_Coptic": [
  	[
  		880,
  		1023
  	]
  ],
  	"Block/Telugu": [
  	[
  		3072,
  		3199
  	]
  ],
  	"Block/Kaithi": [
  	[
  		69760,
  		69839
  	]
  ],
  	"Block/Supplemental_Symbols_And_Pictographs": [
  	[
  		129280,
  		129535
  	]
  ],
  	"Block/Greek_Extended": [
  	[
  		7936,
  		8191
  	]
  ],
  	"Block/Dogra": [
  	[
  		71680,
  		71759
  	]
  ],
  	"Block/Supplemental_Punctuation": [
  	[
  		11776,
  		11903
  	]
  ],
  	"Bidi_Class/Left_To_Right_Isolate": [
  	[
  		8294,
  		8294
  	]
  ],
  	"Bidi_Class/Boundary_Neutral": [
  	[
  		0,
  		8
  	],
  	[
  		14,
  		27
  	],
  	[
  		127,
  		132
  	],
  	[
  		134,
  		159
  	],
  	[
  		173,
  		173
  	],
  	[
  		6158,
  		6158
  	],
  	[
  		8203,
  		8205
  	],
  	[
  		8288,
  		8292
  	],
  	[
  		8298,
  		8303
  	],
  	[
  		65279,
  		65279
  	],
  	[
  		113824,
  		113827
  	],
  	[
  		119155,
  		119162
  	],
  	[
  		917505,
  		917505
  	],
  	[
  		917536,
  		917631
  	]
  ],
  	"Bidi_Class/Right_To_Left": [
  	[
  		1470,
  		1470
  	],
  	[
  		1472,
  		1472
  	],
  	[
  		1475,
  		1475
  	],
  	[
  		1478,
  		1478
  	],
  	[
  		1488,
  		1514
  	],
  	[
  		1519,
  		1524
  	],
  	[
  		1984,
  		2026
  	],
  	[
  		2036,
  		2037
  	],
  	[
  		2042,
  		2042
  	],
  	[
  		2046,
  		2069
  	],
  	[
  		2074,
  		2074
  	],
  	[
  		2084,
  		2084
  	],
  	[
  		2088,
  		2088
  	],
  	[
  		2096,
  		2110
  	],
  	[
  		2112,
  		2136
  	],
  	[
  		2142,
  		2142
  	],
  	[
  		8207,
  		8207
  	],
  	[
  		64285,
  		64285
  	],
  	[
  		64287,
  		64296
  	],
  	[
  		64298,
  		64310
  	],
  	[
  		64312,
  		64316
  	],
  	[
  		64318,
  		64318
  	],
  	[
  		64320,
  		64321
  	],
  	[
  		64323,
  		64324
  	],
  	[
  		64326,
  		64335
  	],
  	[
  		67584,
  		67589
  	],
  	[
  		67592,
  		67592
  	],
  	[
  		67594,
  		67637
  	],
  	[
  		67639,
  		67640
  	],
  	[
  		67644,
  		67644
  	],
  	[
  		67647,
  		67669
  	],
  	[
  		67671,
  		67742
  	],
  	[
  		67751,
  		67759
  	],
  	[
  		67808,
  		67826
  	],
  	[
  		67828,
  		67829
  	],
  	[
  		67835,
  		67867
  	],
  	[
  		67872,
  		67897
  	],
  	[
  		67903,
  		67903
  	],
  	[
  		67968,
  		68023
  	],
  	[
  		68028,
  		68047
  	],
  	[
  		68050,
  		68096
  	],
  	[
  		68112,
  		68115
  	],
  	[
  		68117,
  		68119
  	],
  	[
  		68121,
  		68149
  	],
  	[
  		68160,
  		68168
  	],
  	[
  		68176,
  		68184
  	],
  	[
  		68192,
  		68255
  	],
  	[
  		68288,
  		68324
  	],
  	[
  		68331,
  		68342
  	],
  	[
  		68352,
  		68405
  	],
  	[
  		68416,
  		68437
  	],
  	[
  		68440,
  		68466
  	],
  	[
  		68472,
  		68497
  	],
  	[
  		68505,
  		68508
  	],
  	[
  		68521,
  		68527
  	],
  	[
  		68608,
  		68680
  	],
  	[
  		68736,
  		68786
  	],
  	[
  		68800,
  		68850
  	],
  	[
  		68858,
  		68863
  	],
  	[
  		69248,
  		69289
  	],
  	[
  		69293,
  		69293
  	],
  	[
  		69296,
  		69297
  	],
  	[
  		69376,
  		69415
  	],
  	[
  		69552,
  		69579
  	],
  	[
  		69600,
  		69622
  	],
  	[
  		124928,
  		125124
  	],
  	[
  		125127,
  		125135
  	],
  	[
  		125184,
  		125251
  	],
  	[
  		125259,
  		125259
  	],
  	[
  		125264,
  		125273
  	],
  	[
  		125278,
  		125279
  	]
  ],
  	"Bidi_Class/Arabic_Number": [
  	[
  		1536,
  		1541
  	],
  	[
  		1632,
  		1641
  	],
  	[
  		1643,
  		1644
  	],
  	[
  		1757,
  		1757
  	],
  	[
  		2274,
  		2274
  	],
  	[
  		68912,
  		68921
  	],
  	[
  		69216,
  		69246
  	]
  ],
  	"Bidi_Class/Right_To_Left_Embedding": [
  	[
  		8235,
  		8235
  	]
  ],
  	"Bidi_Class/Pop_Directional_Format": [
  	[
  		8236,
  		8236
  	]
  ],
  	"Bidi_Class/Left_To_Right_Embedding": [
  	[
  		8234,
  		8234
  	]
  ],
  	"Bidi_Class/Left_To_Right": [
  	[
  		65,
  		90
  	],
  	[
  		97,
  		122
  	],
  	[
  		170,
  		170
  	],
  	[
  		181,
  		181
  	],
  	[
  		186,
  		186
  	],
  	[
  		192,
  		214
  	],
  	[
  		216,
  		246
  	],
  	[
  		248,
  		696
  	],
  	[
  		699,
  		705
  	],
  	[
  		720,
  		721
  	],
  	[
  		736,
  		740
  	],
  	[
  		750,
  		750
  	],
  	[
  		880,
  		883
  	],
  	[
  		886,
  		887
  	],
  	[
  		890,
  		893
  	],
  	[
  		895,
  		895
  	],
  	[
  		902,
  		902
  	],
  	[
  		904,
  		906
  	],
  	[
  		908,
  		908
  	],
  	[
  		910,
  		929
  	],
  	[
  		931,
  		1013
  	],
  	[
  		1015,
  		1154
  	],
  	[
  		1162,
  		1327
  	],
  	[
  		1329,
  		1366
  	],
  	[
  		1369,
  		1417
  	],
  	[
  		2307,
  		2361
  	],
  	[
  		2363,
  		2363
  	],
  	[
  		2365,
  		2368
  	],
  	[
  		2377,
  		2380
  	],
  	[
  		2382,
  		2384
  	],
  	[
  		2392,
  		2401
  	],
  	[
  		2404,
  		2432
  	],
  	[
  		2434,
  		2435
  	],
  	[
  		2437,
  		2444
  	],
  	[
  		2447,
  		2448
  	],
  	[
  		2451,
  		2472
  	],
  	[
  		2474,
  		2480
  	],
  	[
  		2482,
  		2482
  	],
  	[
  		2486,
  		2489
  	],
  	[
  		2493,
  		2496
  	],
  	[
  		2503,
  		2504
  	],
  	[
  		2507,
  		2508
  	],
  	[
  		2510,
  		2510
  	],
  	[
  		2519,
  		2519
  	],
  	[
  		2524,
  		2525
  	],
  	[
  		2527,
  		2529
  	],
  	[
  		2534,
  		2545
  	],
  	[
  		2548,
  		2554
  	],
  	[
  		2556,
  		2557
  	],
  	[
  		2563,
  		2563
  	],
  	[
  		2565,
  		2570
  	],
  	[
  		2575,
  		2576
  	],
  	[
  		2579,
  		2600
  	],
  	[
  		2602,
  		2608
  	],
  	[
  		2610,
  		2611
  	],
  	[
  		2613,
  		2614
  	],
  	[
  		2616,
  		2617
  	],
  	[
  		2622,
  		2624
  	],
  	[
  		2649,
  		2652
  	],
  	[
  		2654,
  		2654
  	],
  	[
  		2662,
  		2671
  	],
  	[
  		2674,
  		2676
  	],
  	[
  		2678,
  		2678
  	],
  	[
  		2691,
  		2691
  	],
  	[
  		2693,
  		2701
  	],
  	[
  		2703,
  		2705
  	],
  	[
  		2707,
  		2728
  	],
  	[
  		2730,
  		2736
  	],
  	[
  		2738,
  		2739
  	],
  	[
  		2741,
  		2745
  	],
  	[
  		2749,
  		2752
  	],
  	[
  		2761,
  		2761
  	],
  	[
  		2763,
  		2764
  	],
  	[
  		2768,
  		2768
  	],
  	[
  		2784,
  		2785
  	],
  	[
  		2790,
  		2800
  	],
  	[
  		2809,
  		2809
  	],
  	[
  		2818,
  		2819
  	],
  	[
  		2821,
  		2828
  	],
  	[
  		2831,
  		2832
  	],
  	[
  		2835,
  		2856
  	],
  	[
  		2858,
  		2864
  	],
  	[
  		2866,
  		2867
  	],
  	[
  		2869,
  		2873
  	],
  	[
  		2877,
  		2878
  	],
  	[
  		2880,
  		2880
  	],
  	[
  		2887,
  		2888
  	],
  	[
  		2891,
  		2892
  	],
  	[
  		2903,
  		2903
  	],
  	[
  		2908,
  		2909
  	],
  	[
  		2911,
  		2913
  	],
  	[
  		2918,
  		2935
  	],
  	[
  		2947,
  		2947
  	],
  	[
  		2949,
  		2954
  	],
  	[
  		2958,
  		2960
  	],
  	[
  		2962,
  		2965
  	],
  	[
  		2969,
  		2970
  	],
  	[
  		2972,
  		2972
  	],
  	[
  		2974,
  		2975
  	],
  	[
  		2979,
  		2980
  	],
  	[
  		2984,
  		2986
  	],
  	[
  		2990,
  		3001
  	],
  	[
  		3006,
  		3007
  	],
  	[
  		3009,
  		3010
  	],
  	[
  		3014,
  		3016
  	],
  	[
  		3018,
  		3020
  	],
  	[
  		3024,
  		3024
  	],
  	[
  		3031,
  		3031
  	],
  	[
  		3046,
  		3058
  	],
  	[
  		3073,
  		3075
  	],
  	[
  		3077,
  		3084
  	],
  	[
  		3086,
  		3088
  	],
  	[
  		3090,
  		3112
  	],
  	[
  		3114,
  		3129
  	],
  	[
  		3133,
  		3133
  	],
  	[
  		3137,
  		3140
  	],
  	[
  		3160,
  		3162
  	],
  	[
  		3168,
  		3169
  	],
  	[
  		3174,
  		3183
  	],
  	[
  		3191,
  		3191
  	],
  	[
  		3199,
  		3200
  	],
  	[
  		3202,
  		3212
  	],
  	[
  		3214,
  		3216
  	],
  	[
  		3218,
  		3240
  	],
  	[
  		3242,
  		3251
  	],
  	[
  		3253,
  		3257
  	],
  	[
  		3261,
  		3268
  	],
  	[
  		3270,
  		3272
  	],
  	[
  		3274,
  		3275
  	],
  	[
  		3285,
  		3286
  	],
  	[
  		3294,
  		3294
  	],
  	[
  		3296,
  		3297
  	],
  	[
  		3302,
  		3311
  	],
  	[
  		3313,
  		3314
  	],
  	[
  		3330,
  		3340
  	],
  	[
  		3342,
  		3344
  	],
  	[
  		3346,
  		3386
  	],
  	[
  		3389,
  		3392
  	],
  	[
  		3398,
  		3400
  	],
  	[
  		3402,
  		3404
  	],
  	[
  		3406,
  		3407
  	],
  	[
  		3412,
  		3425
  	],
  	[
  		3430,
  		3455
  	],
  	[
  		3458,
  		3459
  	],
  	[
  		3461,
  		3478
  	],
  	[
  		3482,
  		3505
  	],
  	[
  		3507,
  		3515
  	],
  	[
  		3517,
  		3517
  	],
  	[
  		3520,
  		3526
  	],
  	[
  		3535,
  		3537
  	],
  	[
  		3544,
  		3551
  	],
  	[
  		3558,
  		3567
  	],
  	[
  		3570,
  		3572
  	],
  	[
  		3585,
  		3632
  	],
  	[
  		3634,
  		3635
  	],
  	[
  		3648,
  		3654
  	],
  	[
  		3663,
  		3675
  	],
  	[
  		3713,
  		3714
  	],
  	[
  		3716,
  		3716
  	],
  	[
  		3718,
  		3722
  	],
  	[
  		3724,
  		3747
  	],
  	[
  		3749,
  		3749
  	],
  	[
  		3751,
  		3760
  	],
  	[
  		3762,
  		3763
  	],
  	[
  		3773,
  		3773
  	],
  	[
  		3776,
  		3780
  	],
  	[
  		3782,
  		3782
  	],
  	[
  		3792,
  		3801
  	],
  	[
  		3804,
  		3807
  	],
  	[
  		3840,
  		3863
  	],
  	[
  		3866,
  		3892
  	],
  	[
  		3894,
  		3894
  	],
  	[
  		3896,
  		3896
  	],
  	[
  		3902,
  		3911
  	],
  	[
  		3913,
  		3948
  	],
  	[
  		3967,
  		3967
  	],
  	[
  		3973,
  		3973
  	],
  	[
  		3976,
  		3980
  	],
  	[
  		4030,
  		4037
  	],
  	[
  		4039,
  		4044
  	],
  	[
  		4046,
  		4058
  	],
  	[
  		4096,
  		4140
  	],
  	[
  		4145,
  		4145
  	],
  	[
  		4152,
  		4152
  	],
  	[
  		4155,
  		4156
  	],
  	[
  		4159,
  		4183
  	],
  	[
  		4186,
  		4189
  	],
  	[
  		4193,
  		4208
  	],
  	[
  		4213,
  		4225
  	],
  	[
  		4227,
  		4228
  	],
  	[
  		4231,
  		4236
  	],
  	[
  		4238,
  		4252
  	],
  	[
  		4254,
  		4293
  	],
  	[
  		4295,
  		4295
  	],
  	[
  		4301,
  		4301
  	],
  	[
  		4304,
  		4680
  	],
  	[
  		4682,
  		4685
  	],
  	[
  		4688,
  		4694
  	],
  	[
  		4696,
  		4696
  	],
  	[
  		4698,
  		4701
  	],
  	[
  		4704,
  		4744
  	],
  	[
  		4746,
  		4749
  	],
  	[
  		4752,
  		4784
  	],
  	[
  		4786,
  		4789
  	],
  	[
  		4792,
  		4798
  	],
  	[
  		4800,
  		4800
  	],
  	[
  		4802,
  		4805
  	],
  	[
  		4808,
  		4822
  	],
  	[
  		4824,
  		4880
  	],
  	[
  		4882,
  		4885
  	],
  	[
  		4888,
  		4954
  	],
  	[
  		4960,
  		4988
  	],
  	[
  		4992,
  		5007
  	],
  	[
  		5024,
  		5109
  	],
  	[
  		5112,
  		5117
  	],
  	[
  		5121,
  		5759
  	],
  	[
  		5761,
  		5786
  	],
  	[
  		5792,
  		5880
  	],
  	[
  		5888,
  		5900
  	],
  	[
  		5902,
  		5905
  	],
  	[
  		5920,
  		5937
  	],
  	[
  		5941,
  		5942
  	],
  	[
  		5952,
  		5969
  	],
  	[
  		5984,
  		5996
  	],
  	[
  		5998,
  		6000
  	],
  	[
  		6016,
  		6067
  	],
  	[
  		6070,
  		6070
  	],
  	[
  		6078,
  		6085
  	],
  	[
  		6087,
  		6088
  	],
  	[
  		6100,
  		6106
  	],
  	[
  		6108,
  		6108
  	],
  	[
  		6112,
  		6121
  	],
  	[
  		6160,
  		6169
  	],
  	[
  		6176,
  		6264
  	],
  	[
  		6272,
  		6276
  	],
  	[
  		6279,
  		6312
  	],
  	[
  		6314,
  		6314
  	],
  	[
  		6320,
  		6389
  	],
  	[
  		6400,
  		6430
  	],
  	[
  		6435,
  		6438
  	],
  	[
  		6441,
  		6443
  	],
  	[
  		6448,
  		6449
  	],
  	[
  		6451,
  		6456
  	],
  	[
  		6470,
  		6509
  	],
  	[
  		6512,
  		6516
  	],
  	[
  		6528,
  		6571
  	],
  	[
  		6576,
  		6601
  	],
  	[
  		6608,
  		6618
  	],
  	[
  		6656,
  		6678
  	],
  	[
  		6681,
  		6682
  	],
  	[
  		6686,
  		6741
  	],
  	[
  		6743,
  		6743
  	],
  	[
  		6753,
  		6753
  	],
  	[
  		6755,
  		6756
  	],
  	[
  		6765,
  		6770
  	],
  	[
  		6784,
  		6793
  	],
  	[
  		6800,
  		6809
  	],
  	[
  		6816,
  		6829
  	],
  	[
  		6916,
  		6963
  	],
  	[
  		6965,
  		6965
  	],
  	[
  		6971,
  		6971
  	],
  	[
  		6973,
  		6977
  	],
  	[
  		6979,
  		6987
  	],
  	[
  		6992,
  		7018
  	],
  	[
  		7028,
  		7036
  	],
  	[
  		7042,
  		7073
  	],
  	[
  		7078,
  		7079
  	],
  	[
  		7082,
  		7082
  	],
  	[
  		7086,
  		7141
  	],
  	[
  		7143,
  		7143
  	],
  	[
  		7146,
  		7148
  	],
  	[
  		7150,
  		7150
  	],
  	[
  		7154,
  		7155
  	],
  	[
  		7164,
  		7211
  	],
  	[
  		7220,
  		7221
  	],
  	[
  		7227,
  		7241
  	],
  	[
  		7245,
  		7304
  	],
  	[
  		7312,
  		7354
  	],
  	[
  		7357,
  		7367
  	],
  	[
  		7379,
  		7379
  	],
  	[
  		7393,
  		7393
  	],
  	[
  		7401,
  		7404
  	],
  	[
  		7406,
  		7411
  	],
  	[
  		7413,
  		7415
  	],
  	[
  		7418,
  		7418
  	],
  	[
  		7424,
  		7615
  	],
  	[
  		7680,
  		7957
  	],
  	[
  		7960,
  		7965
  	],
  	[
  		7968,
  		8005
  	],
  	[
  		8008,
  		8013
  	],
  	[
  		8016,
  		8023
  	],
  	[
  		8025,
  		8025
  	],
  	[
  		8027,
  		8027
  	],
  	[
  		8029,
  		8029
  	],
  	[
  		8031,
  		8061
  	],
  	[
  		8064,
  		8116
  	],
  	[
  		8118,
  		8124
  	],
  	[
  		8126,
  		8126
  	],
  	[
  		8130,
  		8132
  	],
  	[
  		8134,
  		8140
  	],
  	[
  		8144,
  		8147
  	],
  	[
  		8150,
  		8155
  	],
  	[
  		8160,
  		8172
  	],
  	[
  		8178,
  		8180
  	],
  	[
  		8182,
  		8188
  	],
  	[
  		8206,
  		8206
  	],
  	[
  		8305,
  		8305
  	],
  	[
  		8319,
  		8319
  	],
  	[
  		8336,
  		8348
  	],
  	[
  		8450,
  		8450
  	],
  	[
  		8455,
  		8455
  	],
  	[
  		8458,
  		8467
  	],
  	[
  		8469,
  		8469
  	],
  	[
  		8473,
  		8477
  	],
  	[
  		8484,
  		8484
  	],
  	[
  		8486,
  		8486
  	],
  	[
  		8488,
  		8488
  	],
  	[
  		8490,
  		8493
  	],
  	[
  		8495,
  		8505
  	],
  	[
  		8508,
  		8511
  	],
  	[
  		8517,
  		8521
  	],
  	[
  		8526,
  		8527
  	],
  	[
  		8544,
  		8584
  	],
  	[
  		9014,
  		9082
  	],
  	[
  		9109,
  		9109
  	],
  	[
  		9372,
  		9449
  	],
  	[
  		9900,
  		9900
  	],
  	[
  		10240,
  		10495
  	],
  	[
  		11264,
  		11310
  	],
  	[
  		11312,
  		11358
  	],
  	[
  		11360,
  		11492
  	],
  	[
  		11499,
  		11502
  	],
  	[
  		11506,
  		11507
  	],
  	[
  		11520,
  		11557
  	],
  	[
  		11559,
  		11559
  	],
  	[
  		11565,
  		11565
  	],
  	[
  		11568,
  		11623
  	],
  	[
  		11631,
  		11632
  	],
  	[
  		11648,
  		11670
  	],
  	[
  		11680,
  		11686
  	],
  	[
  		11688,
  		11694
  	],
  	[
  		11696,
  		11702
  	],
  	[
  		11704,
  		11710
  	],
  	[
  		11712,
  		11718
  	],
  	[
  		11720,
  		11726
  	],
  	[
  		11728,
  		11734
  	],
  	[
  		11736,
  		11742
  	],
  	[
  		12293,
  		12295
  	],
  	[
  		12321,
  		12329
  	],
  	[
  		12334,
  		12335
  	],
  	[
  		12337,
  		12341
  	],
  	[
  		12344,
  		12348
  	],
  	[
  		12353,
  		12438
  	],
  	[
  		12445,
  		12447
  	],
  	[
  		12449,
  		12538
  	],
  	[
  		12540,
  		12543
  	],
  	[
  		12549,
  		12591
  	],
  	[
  		12593,
  		12686
  	],
  	[
  		12688,
  		12735
  	],
  	[
  		12784,
  		12828
  	],
  	[
  		12832,
  		12879
  	],
  	[
  		12896,
  		12923
  	],
  	[
  		12927,
  		12976
  	],
  	[
  		12992,
  		13003
  	],
  	[
  		13008,
  		13174
  	],
  	[
  		13179,
  		13277
  	],
  	[
  		13280,
  		13310
  	],
  	[
  		13312,
  		19903
  	],
  	[
  		19968,
  		40956
  	],
  	[
  		40960,
  		42124
  	],
  	[
  		42192,
  		42508
  	],
  	[
  		42512,
  		42539
  	],
  	[
  		42560,
  		42606
  	],
  	[
  		42624,
  		42653
  	],
  	[
  		42656,
  		42735
  	],
  	[
  		42738,
  		42743
  	],
  	[
  		42786,
  		42887
  	],
  	[
  		42889,
  		42943
  	],
  	[
  		42946,
  		42954
  	],
  	[
  		42997,
  		43009
  	],
  	[
  		43011,
  		43013
  	],
  	[
  		43015,
  		43018
  	],
  	[
  		43020,
  		43044
  	],
  	[
  		43047,
  		43047
  	],
  	[
  		43056,
  		43063
  	],
  	[
  		43072,
  		43123
  	],
  	[
  		43136,
  		43203
  	],
  	[
  		43214,
  		43225
  	],
  	[
  		43250,
  		43262
  	],
  	[
  		43264,
  		43301
  	],
  	[
  		43310,
  		43334
  	],
  	[
  		43346,
  		43347
  	],
  	[
  		43359,
  		43388
  	],
  	[
  		43395,
  		43442
  	],
  	[
  		43444,
  		43445
  	],
  	[
  		43450,
  		43451
  	],
  	[
  		43454,
  		43469
  	],
  	[
  		43471,
  		43481
  	],
  	[
  		43486,
  		43492
  	],
  	[
  		43494,
  		43518
  	],
  	[
  		43520,
  		43560
  	],
  	[
  		43567,
  		43568
  	],
  	[
  		43571,
  		43572
  	],
  	[
  		43584,
  		43586
  	],
  	[
  		43588,
  		43595
  	],
  	[
  		43597,
  		43597
  	],
  	[
  		43600,
  		43609
  	],
  	[
  		43612,
  		43643
  	],
  	[
  		43645,
  		43695
  	],
  	[
  		43697,
  		43697
  	],
  	[
  		43701,
  		43702
  	],
  	[
  		43705,
  		43709
  	],
  	[
  		43712,
  		43712
  	],
  	[
  		43714,
  		43714
  	],
  	[
  		43739,
  		43755
  	],
  	[
  		43758,
  		43765
  	],
  	[
  		43777,
  		43782
  	],
  	[
  		43785,
  		43790
  	],
  	[
  		43793,
  		43798
  	],
  	[
  		43808,
  		43814
  	],
  	[
  		43816,
  		43822
  	],
  	[
  		43824,
  		43881
  	],
  	[
  		43888,
  		44004
  	],
  	[
  		44006,
  		44007
  	],
  	[
  		44009,
  		44012
  	],
  	[
  		44016,
  		44025
  	],
  	[
  		44032,
  		55203
  	],
  	[
  		55216,
  		55238
  	],
  	[
  		55243,
  		55291
  	],
  	[
  		55296,
  		64109
  	],
  	[
  		64112,
  		64217
  	],
  	[
  		64256,
  		64262
  	],
  	[
  		64275,
  		64279
  	],
  	[
  		65313,
  		65338
  	],
  	[
  		65345,
  		65370
  	],
  	[
  		65382,
  		65470
  	],
  	[
  		65474,
  		65479
  	],
  	[
  		65482,
  		65487
  	],
  	[
  		65490,
  		65495
  	],
  	[
  		65498,
  		65500
  	],
  	[
  		65536,
  		65547
  	],
  	[
  		65549,
  		65574
  	],
  	[
  		65576,
  		65594
  	],
  	[
  		65596,
  		65597
  	],
  	[
  		65599,
  		65613
  	],
  	[
  		65616,
  		65629
  	],
  	[
  		65664,
  		65786
  	],
  	[
  		65792,
  		65792
  	],
  	[
  		65794,
  		65794
  	],
  	[
  		65799,
  		65843
  	],
  	[
  		65847,
  		65855
  	],
  	[
  		65933,
  		65934
  	],
  	[
  		66000,
  		66044
  	],
  	[
  		66176,
  		66204
  	],
  	[
  		66208,
  		66256
  	],
  	[
  		66304,
  		66339
  	],
  	[
  		66349,
  		66378
  	],
  	[
  		66384,
  		66421
  	],
  	[
  		66432,
  		66461
  	],
  	[
  		66463,
  		66499
  	],
  	[
  		66504,
  		66517
  	],
  	[
  		66560,
  		66717
  	],
  	[
  		66720,
  		66729
  	],
  	[
  		66736,
  		66771
  	],
  	[
  		66776,
  		66811
  	],
  	[
  		66816,
  		66855
  	],
  	[
  		66864,
  		66915
  	],
  	[
  		66927,
  		66927
  	],
  	[
  		67072,
  		67382
  	],
  	[
  		67392,
  		67413
  	],
  	[
  		67424,
  		67431
  	],
  	[
  		69632,
  		69632
  	],
  	[
  		69634,
  		69687
  	],
  	[
  		69703,
  		69709
  	],
  	[
  		69734,
  		69743
  	],
  	[
  		69762,
  		69810
  	],
  	[
  		69815,
  		69816
  	],
  	[
  		69819,
  		69825
  	],
  	[
  		69837,
  		69837
  	],
  	[
  		69840,
  		69864
  	],
  	[
  		69872,
  		69881
  	],
  	[
  		69891,
  		69926
  	],
  	[
  		69932,
  		69932
  	],
  	[
  		69942,
  		69959
  	],
  	[
  		69968,
  		70002
  	],
  	[
  		70004,
  		70006
  	],
  	[
  		70018,
  		70069
  	],
  	[
  		70079,
  		70088
  	],
  	[
  		70093,
  		70094
  	],
  	[
  		70096,
  		70111
  	],
  	[
  		70113,
  		70132
  	],
  	[
  		70144,
  		70161
  	],
  	[
  		70163,
  		70190
  	],
  	[
  		70194,
  		70195
  	],
  	[
  		70197,
  		70197
  	],
  	[
  		70200,
  		70205
  	],
  	[
  		70272,
  		70278
  	],
  	[
  		70280,
  		70280
  	],
  	[
  		70282,
  		70285
  	],
  	[
  		70287,
  		70301
  	],
  	[
  		70303,
  		70313
  	],
  	[
  		70320,
  		70366
  	],
  	[
  		70368,
  		70370
  	],
  	[
  		70384,
  		70393
  	],
  	[
  		70402,
  		70403
  	],
  	[
  		70405,
  		70412
  	],
  	[
  		70415,
  		70416
  	],
  	[
  		70419,
  		70440
  	],
  	[
  		70442,
  		70448
  	],
  	[
  		70450,
  		70451
  	],
  	[
  		70453,
  		70457
  	],
  	[
  		70461,
  		70463
  	],
  	[
  		70465,
  		70468
  	],
  	[
  		70471,
  		70472
  	],
  	[
  		70475,
  		70477
  	],
  	[
  		70480,
  		70480
  	],
  	[
  		70487,
  		70487
  	],
  	[
  		70493,
  		70499
  	],
  	[
  		70656,
  		70711
  	],
  	[
  		70720,
  		70721
  	],
  	[
  		70725,
  		70725
  	],
  	[
  		70727,
  		70747
  	],
  	[
  		70749,
  		70749
  	],
  	[
  		70751,
  		70753
  	],
  	[
  		70784,
  		70834
  	],
  	[
  		70841,
  		70841
  	],
  	[
  		70843,
  		70846
  	],
  	[
  		70849,
  		70849
  	],
  	[
  		70852,
  		70855
  	],
  	[
  		70864,
  		70873
  	],
  	[
  		71040,
  		71089
  	],
  	[
  		71096,
  		71099
  	],
  	[
  		71102,
  		71102
  	],
  	[
  		71105,
  		71131
  	],
  	[
  		71168,
  		71218
  	],
  	[
  		71227,
  		71228
  	],
  	[
  		71230,
  		71230
  	],
  	[
  		71233,
  		71236
  	],
  	[
  		71248,
  		71257
  	],
  	[
  		71296,
  		71338
  	],
  	[
  		71340,
  		71340
  	],
  	[
  		71342,
  		71343
  	],
  	[
  		71350,
  		71350
  	],
  	[
  		71352,
  		71352
  	],
  	[
  		71360,
  		71369
  	],
  	[
  		71424,
  		71450
  	],
  	[
  		71456,
  		71457
  	],
  	[
  		71462,
  		71462
  	],
  	[
  		71472,
  		71487
  	],
  	[
  		71680,
  		71726
  	],
  	[
  		71736,
  		71736
  	],
  	[
  		71739,
  		71739
  	],
  	[
  		71840,
  		71922
  	],
  	[
  		71935,
  		71942
  	],
  	[
  		71945,
  		71945
  	],
  	[
  		71948,
  		71955
  	],
  	[
  		71957,
  		71958
  	],
  	[
  		71960,
  		71989
  	],
  	[
  		71991,
  		71992
  	],
  	[
  		71997,
  		71997
  	],
  	[
  		71999,
  		72002
  	],
  	[
  		72004,
  		72006
  	],
  	[
  		72016,
  		72025
  	],
  	[
  		72096,
  		72103
  	],
  	[
  		72106,
  		72147
  	],
  	[
  		72156,
  		72159
  	],
  	[
  		72161,
  		72164
  	],
  	[
  		72192,
  		72192
  	],
  	[
  		72199,
  		72200
  	],
  	[
  		72203,
  		72242
  	],
  	[
  		72249,
  		72250
  	],
  	[
  		72255,
  		72262
  	],
  	[
  		72272,
  		72272
  	],
  	[
  		72279,
  		72280
  	],
  	[
  		72284,
  		72329
  	],
  	[
  		72343,
  		72343
  	],
  	[
  		72346,
  		72354
  	],
  	[
  		72384,
  		72440
  	],
  	[
  		72704,
  		72712
  	],
  	[
  		72714,
  		72751
  	],
  	[
  		72766,
  		72773
  	],
  	[
  		72784,
  		72812
  	],
  	[
  		72816,
  		72847
  	],
  	[
  		72873,
  		72873
  	],
  	[
  		72881,
  		72881
  	],
  	[
  		72884,
  		72884
  	],
  	[
  		72960,
  		72966
  	],
  	[
  		72968,
  		72969
  	],
  	[
  		72971,
  		73008
  	],
  	[
  		73030,
  		73030
  	],
  	[
  		73040,
  		73049
  	],
  	[
  		73056,
  		73061
  	],
  	[
  		73063,
  		73064
  	],
  	[
  		73066,
  		73102
  	],
  	[
  		73107,
  		73108
  	],
  	[
  		73110,
  		73110
  	],
  	[
  		73112,
  		73112
  	],
  	[
  		73120,
  		73129
  	],
  	[
  		73440,
  		73458
  	],
  	[
  		73461,
  		73464
  	],
  	[
  		73648,
  		73648
  	],
  	[
  		73664,
  		73684
  	],
  	[
  		73727,
  		74649
  	],
  	[
  		74752,
  		74862
  	],
  	[
  		74864,
  		74868
  	],
  	[
  		74880,
  		75075
  	],
  	[
  		77824,
  		78894
  	],
  	[
  		78896,
  		78904
  	],
  	[
  		82944,
  		83526
  	],
  	[
  		92160,
  		92728
  	],
  	[
  		92736,
  		92766
  	],
  	[
  		92768,
  		92777
  	],
  	[
  		92782,
  		92783
  	],
  	[
  		92880,
  		92909
  	],
  	[
  		92917,
  		92917
  	],
  	[
  		92928,
  		92975
  	],
  	[
  		92983,
  		92997
  	],
  	[
  		93008,
  		93017
  	],
  	[
  		93019,
  		93025
  	],
  	[
  		93027,
  		93047
  	],
  	[
  		93053,
  		93071
  	],
  	[
  		93760,
  		93850
  	],
  	[
  		93952,
  		94026
  	],
  	[
  		94032,
  		94087
  	],
  	[
  		94099,
  		94111
  	],
  	[
  		94176,
  		94177
  	],
  	[
  		94179,
  		94179
  	],
  	[
  		94192,
  		94193
  	],
  	[
  		94208,
  		100343
  	],
  	[
  		100352,
  		101589
  	],
  	[
  		101632,
  		101640
  	],
  	[
  		110592,
  		110878
  	],
  	[
  		110928,
  		110930
  	],
  	[
  		110948,
  		110951
  	],
  	[
  		110960,
  		111355
  	],
  	[
  		113664,
  		113770
  	],
  	[
  		113776,
  		113788
  	],
  	[
  		113792,
  		113800
  	],
  	[
  		113808,
  		113817
  	],
  	[
  		113820,
  		113820
  	],
  	[
  		113823,
  		113823
  	],
  	[
  		118784,
  		119029
  	],
  	[
  		119040,
  		119078
  	],
  	[
  		119081,
  		119142
  	],
  	[
  		119146,
  		119154
  	],
  	[
  		119171,
  		119172
  	],
  	[
  		119180,
  		119209
  	],
  	[
  		119214,
  		119272
  	],
  	[
  		119520,
  		119539
  	],
  	[
  		119648,
  		119672
  	],
  	[
  		119808,
  		119892
  	],
  	[
  		119894,
  		119964
  	],
  	[
  		119966,
  		119967
  	],
  	[
  		119970,
  		119970
  	],
  	[
  		119973,
  		119974
  	],
  	[
  		119977,
  		119980
  	],
  	[
  		119982,
  		119993
  	],
  	[
  		119995,
  		119995
  	],
  	[
  		119997,
  		120003
  	],
  	[
  		120005,
  		120069
  	],
  	[
  		120071,
  		120074
  	],
  	[
  		120077,
  		120084
  	],
  	[
  		120086,
  		120092
  	],
  	[
  		120094,
  		120121
  	],
  	[
  		120123,
  		120126
  	],
  	[
  		120128,
  		120132
  	],
  	[
  		120134,
  		120134
  	],
  	[
  		120138,
  		120144
  	],
  	[
  		120146,
  		120485
  	],
  	[
  		120488,
  		120538
  	],
  	[
  		120540,
  		120596
  	],
  	[
  		120598,
  		120654
  	],
  	[
  		120656,
  		120712
  	],
  	[
  		120714,
  		120770
  	],
  	[
  		120772,
  		120779
  	],
  	[
  		120832,
  		121343
  	],
  	[
  		121399,
  		121402
  	],
  	[
  		121453,
  		121460
  	],
  	[
  		121462,
  		121475
  	],
  	[
  		121477,
  		121483
  	],
  	[
  		123136,
  		123180
  	],
  	[
  		123191,
  		123197
  	],
  	[
  		123200,
  		123209
  	],
  	[
  		123214,
  		123215
  	],
  	[
  		123584,
  		123627
  	],
  	[
  		123632,
  		123641
  	],
  	[
  		127248,
  		127278
  	],
  	[
  		127280,
  		127337
  	],
  	[
  		127344,
  		127404
  	],
  	[
  		127462,
  		127490
  	],
  	[
  		127504,
  		127547
  	],
  	[
  		127552,
  		127560
  	],
  	[
  		127568,
  		127569
  	],
  	[
  		131072,
  		173789
  	],
  	[
  		173824,
  		177972
  	],
  	[
  		177984,
  		178205
  	],
  	[
  		178208,
  		183969
  	],
  	[
  		183984,
  		191456
  	],
  	[
  		194560,
  		195101
  	],
  	[
  		196608,
  		201546
  	],
  	[
  		983040,
  		1048573
  	],
  	[
  		1048576,
  		1114109
  	]
  ],
  	"Bidi_Class/Segment_Separator": [
  	[
  		9,
  		9
  	],
  	[
  		11,
  		11
  	],
  	[
  		31,
  		31
  	]
  ],
  	"Bidi_Class/European_Number": [
  	[
  		48,
  		57
  	],
  	[
  		178,
  		179
  	],
  	[
  		185,
  		185
  	],
  	[
  		1776,
  		1785
  	],
  	[
  		8304,
  		8304
  	],
  	[
  		8308,
  		8313
  	],
  	[
  		8320,
  		8329
  	],
  	[
  		9352,
  		9371
  	],
  	[
  		65296,
  		65305
  	],
  	[
  		66273,
  		66299
  	],
  	[
  		120782,
  		120831
  	],
  	[
  		127232,
  		127242
  	],
  	[
  		130032,
  		130041
  	]
  ],
  	"Bidi_Class/Left_To_Right_Override": [
  	[
  		8237,
  		8237
  	]
  ],
  	"Bidi_Class/Other_Neutral": [
  	[
  		33,
  		34
  	],
  	[
  		38,
  		42
  	],
  	[
  		59,
  		64
  	],
  	[
  		91,
  		96
  	],
  	[
  		123,
  		126
  	],
  	[
  		161,
  		161
  	],
  	[
  		166,
  		169
  	],
  	[
  		171,
  		172
  	],
  	[
  		174,
  		175
  	],
  	[
  		180,
  		180
  	],
  	[
  		182,
  		184
  	],
  	[
  		187,
  		191
  	],
  	[
  		215,
  		215
  	],
  	[
  		247,
  		247
  	],
  	[
  		697,
  		698
  	],
  	[
  		706,
  		719
  	],
  	[
  		722,
  		735
  	],
  	[
  		741,
  		749
  	],
  	[
  		751,
  		767
  	],
  	[
  		884,
  		885
  	],
  	[
  		894,
  		894
  	],
  	[
  		900,
  		901
  	],
  	[
  		903,
  		903
  	],
  	[
  		1014,
  		1014
  	],
  	[
  		1418,
  		1418
  	],
  	[
  		1421,
  		1422
  	],
  	[
  		1542,
  		1543
  	],
  	[
  		1550,
  		1551
  	],
  	[
  		1758,
  		1758
  	],
  	[
  		1769,
  		1769
  	],
  	[
  		2038,
  		2041
  	],
  	[
  		3059,
  		3064
  	],
  	[
  		3066,
  		3066
  	],
  	[
  		3192,
  		3198
  	],
  	[
  		3898,
  		3901
  	],
  	[
  		5008,
  		5017
  	],
  	[
  		5120,
  		5120
  	],
  	[
  		5787,
  		5788
  	],
  	[
  		6128,
  		6137
  	],
  	[
  		6144,
  		6154
  	],
  	[
  		6464,
  		6464
  	],
  	[
  		6468,
  		6469
  	],
  	[
  		6622,
  		6655
  	],
  	[
  		8125,
  		8125
  	],
  	[
  		8127,
  		8129
  	],
  	[
  		8141,
  		8143
  	],
  	[
  		8157,
  		8159
  	],
  	[
  		8173,
  		8175
  	],
  	[
  		8189,
  		8190
  	],
  	[
  		8208,
  		8231
  	],
  	[
  		8245,
  		8259
  	],
  	[
  		8261,
  		8286
  	],
  	[
  		8316,
  		8318
  	],
  	[
  		8332,
  		8334
  	],
  	[
  		8448,
  		8449
  	],
  	[
  		8451,
  		8454
  	],
  	[
  		8456,
  		8457
  	],
  	[
  		8468,
  		8468
  	],
  	[
  		8470,
  		8472
  	],
  	[
  		8478,
  		8483
  	],
  	[
  		8485,
  		8485
  	],
  	[
  		8487,
  		8487
  	],
  	[
  		8489,
  		8489
  	],
  	[
  		8506,
  		8507
  	],
  	[
  		8512,
  		8516
  	],
  	[
  		8522,
  		8525
  	],
  	[
  		8528,
  		8543
  	],
  	[
  		8585,
  		8587
  	],
  	[
  		8592,
  		8721
  	],
  	[
  		8724,
  		9013
  	],
  	[
  		9083,
  		9108
  	],
  	[
  		9110,
  		9254
  	],
  	[
  		9280,
  		9290
  	],
  	[
  		9312,
  		9351
  	],
  	[
  		9450,
  		9899
  	],
  	[
  		9901,
  		10239
  	],
  	[
  		10496,
  		11123
  	],
  	[
  		11126,
  		11157
  	],
  	[
  		11159,
  		11263
  	],
  	[
  		11493,
  		11498
  	],
  	[
  		11513,
  		11519
  	],
  	[
  		11776,
  		11858
  	],
  	[
  		11904,
  		11929
  	],
  	[
  		11931,
  		12019
  	],
  	[
  		12032,
  		12245
  	],
  	[
  		12272,
  		12283
  	],
  	[
  		12289,
  		12292
  	],
  	[
  		12296,
  		12320
  	],
  	[
  		12336,
  		12336
  	],
  	[
  		12342,
  		12343
  	],
  	[
  		12349,
  		12351
  	],
  	[
  		12443,
  		12444
  	],
  	[
  		12448,
  		12448
  	],
  	[
  		12539,
  		12539
  	],
  	[
  		12736,
  		12771
  	],
  	[
  		12829,
  		12830
  	],
  	[
  		12880,
  		12895
  	],
  	[
  		12924,
  		12926
  	],
  	[
  		12977,
  		12991
  	],
  	[
  		13004,
  		13007
  	],
  	[
  		13175,
  		13178
  	],
  	[
  		13278,
  		13279
  	],
  	[
  		13311,
  		13311
  	],
  	[
  		19904,
  		19967
  	],
  	[
  		42128,
  		42182
  	],
  	[
  		42509,
  		42511
  	],
  	[
  		42611,
  		42611
  	],
  	[
  		42622,
  		42623
  	],
  	[
  		42752,
  		42785
  	],
  	[
  		42888,
  		42888
  	],
  	[
  		43048,
  		43051
  	],
  	[
  		43124,
  		43127
  	],
  	[
  		43882,
  		43883
  	],
  	[
  		64830,
  		64831
  	],
  	[
  		65021,
  		65021
  	],
  	[
  		65040,
  		65049
  	],
  	[
  		65072,
  		65103
  	],
  	[
  		65105,
  		65105
  	],
  	[
  		65108,
  		65108
  	],
  	[
  		65110,
  		65118
  	],
  	[
  		65120,
  		65121
  	],
  	[
  		65124,
  		65126
  	],
  	[
  		65128,
  		65128
  	],
  	[
  		65131,
  		65131
  	],
  	[
  		65281,
  		65282
  	],
  	[
  		65286,
  		65290
  	],
  	[
  		65307,
  		65312
  	],
  	[
  		65339,
  		65344
  	],
  	[
  		65371,
  		65381
  	],
  	[
  		65506,
  		65508
  	],
  	[
  		65512,
  		65518
  	],
  	[
  		65529,
  		65533
  	],
  	[
  		65793,
  		65793
  	],
  	[
  		65856,
  		65932
  	],
  	[
  		65936,
  		65948
  	],
  	[
  		65952,
  		65952
  	],
  	[
  		67871,
  		67871
  	],
  	[
  		68409,
  		68415
  	],
  	[
  		69714,
  		69733
  	],
  	[
  		71264,
  		71276
  	],
  	[
  		73685,
  		73692
  	],
  	[
  		73697,
  		73713
  	],
  	[
  		94178,
  		94178
  	],
  	[
  		119296,
  		119361
  	],
  	[
  		119365,
  		119365
  	],
  	[
  		119552,
  		119638
  	],
  	[
  		120539,
  		120539
  	],
  	[
  		120597,
  		120597
  	],
  	[
  		120655,
  		120655
  	],
  	[
  		120713,
  		120713
  	],
  	[
  		120771,
  		120771
  	],
  	[
  		126704,
  		126705
  	],
  	[
  		126976,
  		127019
  	],
  	[
  		127024,
  		127123
  	],
  	[
  		127136,
  		127150
  	],
  	[
  		127153,
  		127167
  	],
  	[
  		127169,
  		127183
  	],
  	[
  		127185,
  		127221
  	],
  	[
  		127243,
  		127247
  	],
  	[
  		127279,
  		127279
  	],
  	[
  		127338,
  		127343
  	],
  	[
  		127405,
  		127405
  	],
  	[
  		127584,
  		127589
  	],
  	[
  		127744,
  		128727
  	],
  	[
  		128736,
  		128748
  	],
  	[
  		128752,
  		128764
  	],
  	[
  		128768,
  		128883
  	],
  	[
  		128896,
  		128984
  	],
  	[
  		128992,
  		129003
  	],
  	[
  		129024,
  		129035
  	],
  	[
  		129040,
  		129095
  	],
  	[
  		129104,
  		129113
  	],
  	[
  		129120,
  		129159
  	],
  	[
  		129168,
  		129197
  	],
  	[
  		129200,
  		129201
  	],
  	[
  		129280,
  		129400
  	],
  	[
  		129402,
  		129483
  	],
  	[
  		129485,
  		129619
  	],
  	[
  		129632,
  		129645
  	],
  	[
  		129648,
  		129652
  	],
  	[
  		129656,
  		129658
  	],
  	[
  		129664,
  		129670
  	],
  	[
  		129680,
  		129704
  	],
  	[
  		129712,
  		129718
  	],
  	[
  		129728,
  		129730
  	],
  	[
  		129744,
  		129750
  	],
  	[
  		129792,
  		129938
  	],
  	[
  		129940,
  		129994
  	]
  ],
  	"Bidi_Class/Arabic_Letter": [
  	[
  		1544,
  		1544
  	],
  	[
  		1547,
  		1547
  	],
  	[
  		1549,
  		1549
  	],
  	[
  		1563,
  		1564
  	],
  	[
  		1566,
  		1610
  	],
  	[
  		1645,
  		1647
  	],
  	[
  		1649,
  		1749
  	],
  	[
  		1765,
  		1766
  	],
  	[
  		1774,
  		1775
  	],
  	[
  		1786,
  		1805
  	],
  	[
  		1807,
  		1808
  	],
  	[
  		1810,
  		1839
  	],
  	[
  		1869,
  		1957
  	],
  	[
  		1969,
  		1969
  	],
  	[
  		2144,
  		2154
  	],
  	[
  		2208,
  		2228
  	],
  	[
  		2230,
  		2247
  	],
  	[
  		64336,
  		64449
  	],
  	[
  		64467,
  		64829
  	],
  	[
  		64848,
  		64911
  	],
  	[
  		64914,
  		64967
  	],
  	[
  		65008,
  		65020
  	],
  	[
  		65136,
  		65140
  	],
  	[
  		65142,
  		65276
  	],
  	[
  		68864,
  		68899
  	],
  	[
  		69424,
  		69445
  	],
  	[
  		69457,
  		69465
  	],
  	[
  		126065,
  		126132
  	],
  	[
  		126209,
  		126269
  	],
  	[
  		126464,
  		126467
  	],
  	[
  		126469,
  		126495
  	],
  	[
  		126497,
  		126498
  	],
  	[
  		126500,
  		126500
  	],
  	[
  		126503,
  		126503
  	],
  	[
  		126505,
  		126514
  	],
  	[
  		126516,
  		126519
  	],
  	[
  		126521,
  		126521
  	],
  	[
  		126523,
  		126523
  	],
  	[
  		126530,
  		126530
  	],
  	[
  		126535,
  		126535
  	],
  	[
  		126537,
  		126537
  	],
  	[
  		126539,
  		126539
  	],
  	[
  		126541,
  		126543
  	],
  	[
  		126545,
  		126546
  	],
  	[
  		126548,
  		126548
  	],
  	[
  		126551,
  		126551
  	],
  	[
  		126553,
  		126553
  	],
  	[
  		126555,
  		126555
  	],
  	[
  		126557,
  		126557
  	],
  	[
  		126559,
  		126559
  	],
  	[
  		126561,
  		126562
  	],
  	[
  		126564,
  		126564
  	],
  	[
  		126567,
  		126570
  	],
  	[
  		126572,
  		126578
  	],
  	[
  		126580,
  		126583
  	],
  	[
  		126585,
  		126588
  	],
  	[
  		126590,
  		126590
  	],
  	[
  		126592,
  		126601
  	],
  	[
  		126603,
  		126619
  	],
  	[
  		126625,
  		126627
  	],
  	[
  		126629,
  		126633
  	],
  	[
  		126635,
  		126651
  	]
  ],
  	"Bidi_Class/Paragraph_Separator": [
  	[
  		10,
  		10
  	],
  	[
  		13,
  		13
  	],
  	[
  		28,
  		30
  	],
  	[
  		133,
  		133
  	],
  	[
  		8233,
  		8233
  	]
  ],
  	"Bidi_Class/European_Terminator": [
  	[
  		35,
  		37
  	],
  	[
  		162,
  		165
  	],
  	[
  		176,
  		177
  	],
  	[
  		1423,
  		1423
  	],
  	[
  		1545,
  		1546
  	],
  	[
  		1642,
  		1642
  	],
  	[
  		2546,
  		2547
  	],
  	[
  		2555,
  		2555
  	],
  	[
  		2801,
  		2801
  	],
  	[
  		3065,
  		3065
  	],
  	[
  		3647,
  		3647
  	],
  	[
  		6107,
  		6107
  	],
  	[
  		8240,
  		8244
  	],
  	[
  		8352,
  		8383
  	],
  	[
  		8494,
  		8494
  	],
  	[
  		8723,
  		8723
  	],
  	[
  		43064,
  		43065
  	],
  	[
  		65119,
  		65119
  	],
  	[
  		65129,
  		65130
  	],
  	[
  		65283,
  		65285
  	],
  	[
  		65504,
  		65505
  	],
  	[
  		65509,
  		65510
  	],
  	[
  		73693,
  		73696
  	],
  	[
  		123647,
  		123647
  	]
  ],
  	"Bidi_Class/Right_To_Left_Isolate": [
  	[
  		8295,
  		8295
  	]
  ],
  	"Bidi_Class/Pop_Directional_Isolate": [
  	[
  		8297,
  		8297
  	]
  ],
  	"Bidi_Class/Right_To_Left_Override": [
  	[
  		8238,
  		8238
  	]
  ],
  	"Bidi_Class/European_Separator": [
  	[
  		43,
  		43
  	],
  	[
  		45,
  		45
  	],
  	[
  		8314,
  		8315
  	],
  	[
  		8330,
  		8331
  	],
  	[
  		8722,
  		8722
  	],
  	[
  		64297,
  		64297
  	],
  	[
  		65122,
  		65123
  	],
  	[
  		65291,
  		65291
  	],
  	[
  		65293,
  		65293
  	]
  ],
  	"Bidi_Class/Common_Separator": [
  	[
  		44,
  		44
  	],
  	[
  		46,
  		47
  	],
  	[
  		58,
  		58
  	],
  	[
  		160,
  		160
  	],
  	[
  		1548,
  		1548
  	],
  	[
  		8239,
  		8239
  	],
  	[
  		8260,
  		8260
  	],
  	[
  		65104,
  		65104
  	],
  	[
  		65106,
  		65106
  	],
  	[
  		65109,
  		65109
  	],
  	[
  		65292,
  		65292
  	],
  	[
  		65294,
  		65295
  	],
  	[
  		65306,
  		65306
  	]
  ],
  	"Bidi_Class/First_Strong_Isolate": [
  	[
  		8296,
  		8296
  	]
  ],
  	"Bidi_Class/White_Space": [
  	[
  		12,
  		12
  	],
  	[
  		32,
  		32
  	],
  	[
  		5760,
  		5760
  	],
  	[
  		8192,
  		8202
  	],
  	[
  		8232,
  		8232
  	],
  	[
  		8287,
  		8287
  	],
  	[
  		12288,
  		12288
  	]
  ],
  	"Bidi_Class/Nonspacing_Mark": [
  	[
  		768,
  		879
  	],
  	[
  		1155,
  		1161
  	],
  	[
  		1425,
  		1469
  	],
  	[
  		1471,
  		1471
  	],
  	[
  		1473,
  		1474
  	],
  	[
  		1476,
  		1477
  	],
  	[
  		1479,
  		1479
  	],
  	[
  		1552,
  		1562
  	],
  	[
  		1611,
  		1631
  	],
  	[
  		1648,
  		1648
  	],
  	[
  		1750,
  		1756
  	],
  	[
  		1759,
  		1764
  	],
  	[
  		1767,
  		1768
  	],
  	[
  		1770,
  		1773
  	],
  	[
  		1809,
  		1809
  	],
  	[
  		1840,
  		1866
  	],
  	[
  		1958,
  		1968
  	],
  	[
  		2027,
  		2035
  	],
  	[
  		2045,
  		2045
  	],
  	[
  		2070,
  		2073
  	],
  	[
  		2075,
  		2083
  	],
  	[
  		2085,
  		2087
  	],
  	[
  		2089,
  		2093
  	],
  	[
  		2137,
  		2139
  	],
  	[
  		2259,
  		2273
  	],
  	[
  		2275,
  		2306
  	],
  	[
  		2362,
  		2362
  	],
  	[
  		2364,
  		2364
  	],
  	[
  		2369,
  		2376
  	],
  	[
  		2381,
  		2381
  	],
  	[
  		2385,
  		2391
  	],
  	[
  		2402,
  		2403
  	],
  	[
  		2433,
  		2433
  	],
  	[
  		2492,
  		2492
  	],
  	[
  		2497,
  		2500
  	],
  	[
  		2509,
  		2509
  	],
  	[
  		2530,
  		2531
  	],
  	[
  		2558,
  		2558
  	],
  	[
  		2561,
  		2562
  	],
  	[
  		2620,
  		2620
  	],
  	[
  		2625,
  		2626
  	],
  	[
  		2631,
  		2632
  	],
  	[
  		2635,
  		2637
  	],
  	[
  		2641,
  		2641
  	],
  	[
  		2672,
  		2673
  	],
  	[
  		2677,
  		2677
  	],
  	[
  		2689,
  		2690
  	],
  	[
  		2748,
  		2748
  	],
  	[
  		2753,
  		2757
  	],
  	[
  		2759,
  		2760
  	],
  	[
  		2765,
  		2765
  	],
  	[
  		2786,
  		2787
  	],
  	[
  		2810,
  		2815
  	],
  	[
  		2817,
  		2817
  	],
  	[
  		2876,
  		2876
  	],
  	[
  		2879,
  		2879
  	],
  	[
  		2881,
  		2884
  	],
  	[
  		2893,
  		2893
  	],
  	[
  		2901,
  		2902
  	],
  	[
  		2914,
  		2915
  	],
  	[
  		2946,
  		2946
  	],
  	[
  		3008,
  		3008
  	],
  	[
  		3021,
  		3021
  	],
  	[
  		3072,
  		3072
  	],
  	[
  		3076,
  		3076
  	],
  	[
  		3134,
  		3136
  	],
  	[
  		3142,
  		3144
  	],
  	[
  		3146,
  		3149
  	],
  	[
  		3157,
  		3158
  	],
  	[
  		3170,
  		3171
  	],
  	[
  		3201,
  		3201
  	],
  	[
  		3260,
  		3260
  	],
  	[
  		3276,
  		3277
  	],
  	[
  		3298,
  		3299
  	],
  	[
  		3328,
  		3329
  	],
  	[
  		3387,
  		3388
  	],
  	[
  		3393,
  		3396
  	],
  	[
  		3405,
  		3405
  	],
  	[
  		3426,
  		3427
  	],
  	[
  		3457,
  		3457
  	],
  	[
  		3530,
  		3530
  	],
  	[
  		3538,
  		3540
  	],
  	[
  		3542,
  		3542
  	],
  	[
  		3633,
  		3633
  	],
  	[
  		3636,
  		3642
  	],
  	[
  		3655,
  		3662
  	],
  	[
  		3761,
  		3761
  	],
  	[
  		3764,
  		3772
  	],
  	[
  		3784,
  		3789
  	],
  	[
  		3864,
  		3865
  	],
  	[
  		3893,
  		3893
  	],
  	[
  		3895,
  		3895
  	],
  	[
  		3897,
  		3897
  	],
  	[
  		3953,
  		3966
  	],
  	[
  		3968,
  		3972
  	],
  	[
  		3974,
  		3975
  	],
  	[
  		3981,
  		3991
  	],
  	[
  		3993,
  		4028
  	],
  	[
  		4038,
  		4038
  	],
  	[
  		4141,
  		4144
  	],
  	[
  		4146,
  		4151
  	],
  	[
  		4153,
  		4154
  	],
  	[
  		4157,
  		4158
  	],
  	[
  		4184,
  		4185
  	],
  	[
  		4190,
  		4192
  	],
  	[
  		4209,
  		4212
  	],
  	[
  		4226,
  		4226
  	],
  	[
  		4229,
  		4230
  	],
  	[
  		4237,
  		4237
  	],
  	[
  		4253,
  		4253
  	],
  	[
  		4957,
  		4959
  	],
  	[
  		5906,
  		5908
  	],
  	[
  		5938,
  		5940
  	],
  	[
  		5970,
  		5971
  	],
  	[
  		6002,
  		6003
  	],
  	[
  		6068,
  		6069
  	],
  	[
  		6071,
  		6077
  	],
  	[
  		6086,
  		6086
  	],
  	[
  		6089,
  		6099
  	],
  	[
  		6109,
  		6109
  	],
  	[
  		6155,
  		6157
  	],
  	[
  		6277,
  		6278
  	],
  	[
  		6313,
  		6313
  	],
  	[
  		6432,
  		6434
  	],
  	[
  		6439,
  		6440
  	],
  	[
  		6450,
  		6450
  	],
  	[
  		6457,
  		6459
  	],
  	[
  		6679,
  		6680
  	],
  	[
  		6683,
  		6683
  	],
  	[
  		6742,
  		6742
  	],
  	[
  		6744,
  		6750
  	],
  	[
  		6752,
  		6752
  	],
  	[
  		6754,
  		6754
  	],
  	[
  		6757,
  		6764
  	],
  	[
  		6771,
  		6780
  	],
  	[
  		6783,
  		6783
  	],
  	[
  		6832,
  		6848
  	],
  	[
  		6912,
  		6915
  	],
  	[
  		6964,
  		6964
  	],
  	[
  		6966,
  		6970
  	],
  	[
  		6972,
  		6972
  	],
  	[
  		6978,
  		6978
  	],
  	[
  		7019,
  		7027
  	],
  	[
  		7040,
  		7041
  	],
  	[
  		7074,
  		7077
  	],
  	[
  		7080,
  		7081
  	],
  	[
  		7083,
  		7085
  	],
  	[
  		7142,
  		7142
  	],
  	[
  		7144,
  		7145
  	],
  	[
  		7149,
  		7149
  	],
  	[
  		7151,
  		7153
  	],
  	[
  		7212,
  		7219
  	],
  	[
  		7222,
  		7223
  	],
  	[
  		7376,
  		7378
  	],
  	[
  		7380,
  		7392
  	],
  	[
  		7394,
  		7400
  	],
  	[
  		7405,
  		7405
  	],
  	[
  		7412,
  		7412
  	],
  	[
  		7416,
  		7417
  	],
  	[
  		7616,
  		7673
  	],
  	[
  		7675,
  		7679
  	],
  	[
  		8400,
  		8432
  	],
  	[
  		11503,
  		11505
  	],
  	[
  		11647,
  		11647
  	],
  	[
  		11744,
  		11775
  	],
  	[
  		12330,
  		12333
  	],
  	[
  		12441,
  		12442
  	],
  	[
  		42607,
  		42610
  	],
  	[
  		42612,
  		42621
  	],
  	[
  		42654,
  		42655
  	],
  	[
  		42736,
  		42737
  	],
  	[
  		43010,
  		43010
  	],
  	[
  		43014,
  		43014
  	],
  	[
  		43019,
  		43019
  	],
  	[
  		43045,
  		43046
  	],
  	[
  		43052,
  		43052
  	],
  	[
  		43204,
  		43205
  	],
  	[
  		43232,
  		43249
  	],
  	[
  		43263,
  		43263
  	],
  	[
  		43302,
  		43309
  	],
  	[
  		43335,
  		43345
  	],
  	[
  		43392,
  		43394
  	],
  	[
  		43443,
  		43443
  	],
  	[
  		43446,
  		43449
  	],
  	[
  		43452,
  		43453
  	],
  	[
  		43493,
  		43493
  	],
  	[
  		43561,
  		43566
  	],
  	[
  		43569,
  		43570
  	],
  	[
  		43573,
  		43574
  	],
  	[
  		43587,
  		43587
  	],
  	[
  		43596,
  		43596
  	],
  	[
  		43644,
  		43644
  	],
  	[
  		43696,
  		43696
  	],
  	[
  		43698,
  		43700
  	],
  	[
  		43703,
  		43704
  	],
  	[
  		43710,
  		43711
  	],
  	[
  		43713,
  		43713
  	],
  	[
  		43756,
  		43757
  	],
  	[
  		43766,
  		43766
  	],
  	[
  		44005,
  		44005
  	],
  	[
  		44008,
  		44008
  	],
  	[
  		44013,
  		44013
  	],
  	[
  		64286,
  		64286
  	],
  	[
  		65024,
  		65039
  	],
  	[
  		65056,
  		65071
  	],
  	[
  		66045,
  		66045
  	],
  	[
  		66272,
  		66272
  	],
  	[
  		66422,
  		66426
  	],
  	[
  		68097,
  		68099
  	],
  	[
  		68101,
  		68102
  	],
  	[
  		68108,
  		68111
  	],
  	[
  		68152,
  		68154
  	],
  	[
  		68159,
  		68159
  	],
  	[
  		68325,
  		68326
  	],
  	[
  		68900,
  		68903
  	],
  	[
  		69291,
  		69292
  	],
  	[
  		69446,
  		69456
  	],
  	[
  		69633,
  		69633
  	],
  	[
  		69688,
  		69702
  	],
  	[
  		69759,
  		69761
  	],
  	[
  		69811,
  		69814
  	],
  	[
  		69817,
  		69818
  	],
  	[
  		69888,
  		69890
  	],
  	[
  		69927,
  		69931
  	],
  	[
  		69933,
  		69940
  	],
  	[
  		70003,
  		70003
  	],
  	[
  		70016,
  		70017
  	],
  	[
  		70070,
  		70078
  	],
  	[
  		70089,
  		70092
  	],
  	[
  		70095,
  		70095
  	],
  	[
  		70191,
  		70193
  	],
  	[
  		70196,
  		70196
  	],
  	[
  		70198,
  		70199
  	],
  	[
  		70206,
  		70206
  	],
  	[
  		70367,
  		70367
  	],
  	[
  		70371,
  		70378
  	],
  	[
  		70400,
  		70401
  	],
  	[
  		70459,
  		70460
  	],
  	[
  		70464,
  		70464
  	],
  	[
  		70502,
  		70508
  	],
  	[
  		70512,
  		70516
  	],
  	[
  		70712,
  		70719
  	],
  	[
  		70722,
  		70724
  	],
  	[
  		70726,
  		70726
  	],
  	[
  		70750,
  		70750
  	],
  	[
  		70835,
  		70840
  	],
  	[
  		70842,
  		70842
  	],
  	[
  		70847,
  		70848
  	],
  	[
  		70850,
  		70851
  	],
  	[
  		71090,
  		71093
  	],
  	[
  		71100,
  		71101
  	],
  	[
  		71103,
  		71104
  	],
  	[
  		71132,
  		71133
  	],
  	[
  		71219,
  		71226
  	],
  	[
  		71229,
  		71229
  	],
  	[
  		71231,
  		71232
  	],
  	[
  		71339,
  		71339
  	],
  	[
  		71341,
  		71341
  	],
  	[
  		71344,
  		71349
  	],
  	[
  		71351,
  		71351
  	],
  	[
  		71453,
  		71455
  	],
  	[
  		71458,
  		71461
  	],
  	[
  		71463,
  		71467
  	],
  	[
  		71727,
  		71735
  	],
  	[
  		71737,
  		71738
  	],
  	[
  		71995,
  		71996
  	],
  	[
  		71998,
  		71998
  	],
  	[
  		72003,
  		72003
  	],
  	[
  		72148,
  		72151
  	],
  	[
  		72154,
  		72155
  	],
  	[
  		72160,
  		72160
  	],
  	[
  		72193,
  		72198
  	],
  	[
  		72201,
  		72202
  	],
  	[
  		72243,
  		72248
  	],
  	[
  		72251,
  		72254
  	],
  	[
  		72263,
  		72263
  	],
  	[
  		72273,
  		72278
  	],
  	[
  		72281,
  		72283
  	],
  	[
  		72330,
  		72342
  	],
  	[
  		72344,
  		72345
  	],
  	[
  		72752,
  		72758
  	],
  	[
  		72760,
  		72765
  	],
  	[
  		72850,
  		72871
  	],
  	[
  		72874,
  		72880
  	],
  	[
  		72882,
  		72883
  	],
  	[
  		72885,
  		72886
  	],
  	[
  		73009,
  		73014
  	],
  	[
  		73018,
  		73018
  	],
  	[
  		73020,
  		73021
  	],
  	[
  		73023,
  		73029
  	],
  	[
  		73031,
  		73031
  	],
  	[
  		73104,
  		73105
  	],
  	[
  		73109,
  		73109
  	],
  	[
  		73111,
  		73111
  	],
  	[
  		73459,
  		73460
  	],
  	[
  		92912,
  		92916
  	],
  	[
  		92976,
  		92982
  	],
  	[
  		94031,
  		94031
  	],
  	[
  		94095,
  		94098
  	],
  	[
  		94180,
  		94180
  	],
  	[
  		113821,
  		113822
  	],
  	[
  		119143,
  		119145
  	],
  	[
  		119163,
  		119170
  	],
  	[
  		119173,
  		119179
  	],
  	[
  		119210,
  		119213
  	],
  	[
  		119362,
  		119364
  	],
  	[
  		121344,
  		121398
  	],
  	[
  		121403,
  		121452
  	],
  	[
  		121461,
  		121461
  	],
  	[
  		121476,
  		121476
  	],
  	[
  		121499,
  		121503
  	],
  	[
  		121505,
  		121519
  	],
  	[
  		122880,
  		122886
  	],
  	[
  		122888,
  		122904
  	],
  	[
  		122907,
  		122913
  	],
  	[
  		122915,
  		122916
  	],
  	[
  		122918,
  		122922
  	],
  	[
  		123184,
  		123190
  	],
  	[
  		123628,
  		123631
  	],
  	[
  		125136,
  		125142
  	],
  	[
  		125252,
  		125258
  	],
  	[
  		917760,
  		917999
  	]
  ],
  	"Script/Phoenician": [
  	[
  		67840,
  		67867
  	],
  	[
  		67871,
  		67871
  	]
  ],
  	"Script/Nabataean": [
  	[
  		67712,
  		67742
  	],
  	[
  		67751,
  		67759
  	]
  ],
  	"Script/Mandaic": [
  	[
  		2112,
  		2139
  	],
  	[
  		2142,
  		2142
  	]
  ],
  	"Script/Meroitic_Hieroglyphs": [
  	[
  		67968,
  		67999
  	]
  ],
  	"Script/Avestan": [
  	[
  		68352,
  		68405
  	],
  	[
  		68409,
  		68415
  	]
  ],
  	"Script/Batak": [
  	[
  		7104,
  		7155
  	],
  	[
  		7164,
  		7167
  	]
  ],
  	"Script/Mro": [
  	[
  		92736,
  		92766
  	],
  	[
  		92768,
  		92777
  	],
  	[
  		92782,
  		92783
  	]
  ],
  	"Script/Sharada": [
  	[
  		70016,
  		70111
  	]
  ],
  	"Script/Han": [
  	[
  		11904,
  		11929
  	],
  	[
  		11931,
  		12019
  	],
  	[
  		12032,
  		12245
  	],
  	[
  		12293,
  		12293
  	],
  	[
  		12295,
  		12295
  	],
  	[
  		12321,
  		12329
  	],
  	[
  		12344,
  		12347
  	],
  	[
  		13312,
  		19903
  	],
  	[
  		19968,
  		40956
  	],
  	[
  		63744,
  		64109
  	],
  	[
  		64112,
  		64217
  	],
  	[
  		94192,
  		94193
  	],
  	[
  		131072,
  		173789
  	],
  	[
  		173824,
  		177972
  	],
  	[
  		177984,
  		178205
  	],
  	[
  		178208,
  		183969
  	],
  	[
  		183984,
  		191456
  	],
  	[
  		194560,
  		195101
  	],
  	[
  		196608,
  		201546
  	]
  ],
  	"Script/Tagbanwa": [
  	[
  		5984,
  		5996
  	],
  	[
  		5998,
  		6000
  	],
  	[
  		6002,
  		6003
  	]
  ],
  	"Script/Old_Permic": [
  	[
  		66384,
  		66426
  	]
  ],
  	"Script/Canadian_Aboriginal": [
  	[
  		5120,
  		5759
  	],
  	[
  		6320,
  		6389
  	]
  ],
  	"Script/Warang_Citi": [
  	[
  		71840,
  		71922
  	],
  	[
  		71935,
  		71935
  	]
  ],
  	"Script/Mahajani": [
  	[
  		69968,
  		70006
  	]
  ],
  	"Script/Rejang": [
  	[
  		43312,
  		43347
  	],
  	[
  		43359,
  		43359
  	]
  ],
  	"Script/Ogham": [
  	[
  		5760,
  		5788
  	]
  ],
  	"Script/Thai": [
  	[
  		3585,
  		3642
  	],
  	[
  		3648,
  		3675
  	]
  ],
  	"Script/Tangut": [
  	[
  		94176,
  		94176
  	],
  	[
  		94208,
  		100343
  	],
  	[
  		100352,
  		101119
  	],
  	[
  		101632,
  		101640
  	]
  ],
  	"Script/Bhaiksuki": [
  	[
  		72704,
  		72712
  	],
  	[
  		72714,
  		72758
  	],
  	[
  		72760,
  		72773
  	],
  	[
  		72784,
  		72812
  	]
  ],
  	"Script/Runic": [
  	[
  		5792,
  		5866
  	],
  	[
  		5870,
  		5880
  	]
  ],
  	"Script/Sora_Sompeng": [
  	[
  		69840,
  		69864
  	],
  	[
  		69872,
  		69881
  	]
  ],
  	"Script/Samaritan": [
  	[
  		2048,
  		2093
  	],
  	[
  		2096,
  		2110
  	]
  ],
  	"Script/Newa": [
  	[
  		70656,
  		70747
  	],
  	[
  		70749,
  		70753
  	]
  ],
  	"Script/Limbu": [
  	[
  		6400,
  		6430
  	],
  	[
  		6432,
  		6443
  	],
  	[
  		6448,
  		6459
  	],
  	[
  		6464,
  		6464
  	],
  	[
  		6468,
  		6479
  	]
  ],
  	"Script/Osage": [
  	[
  		66736,
  		66771
  	],
  	[
  		66776,
  		66811
  	]
  ],
  	"Script/Common": [
  	[
  		0,
  		64
  	],
  	[
  		91,
  		96
  	],
  	[
  		123,
  		169
  	],
  	[
  		171,
  		185
  	],
  	[
  		187,
  		191
  	],
  	[
  		215,
  		215
  	],
  	[
  		247,
  		247
  	],
  	[
  		697,
  		735
  	],
  	[
  		741,
  		745
  	],
  	[
  		748,
  		767
  	],
  	[
  		884,
  		884
  	],
  	[
  		894,
  		894
  	],
  	[
  		901,
  		901
  	],
  	[
  		903,
  		903
  	],
  	[
  		1541,
  		1541
  	],
  	[
  		1548,
  		1548
  	],
  	[
  		1563,
  		1563
  	],
  	[
  		1567,
  		1567
  	],
  	[
  		1600,
  		1600
  	],
  	[
  		1757,
  		1757
  	],
  	[
  		2274,
  		2274
  	],
  	[
  		2404,
  		2405
  	],
  	[
  		3647,
  		3647
  	],
  	[
  		4053,
  		4056
  	],
  	[
  		4347,
  		4347
  	],
  	[
  		5867,
  		5869
  	],
  	[
  		5941,
  		5942
  	],
  	[
  		6146,
  		6147
  	],
  	[
  		6149,
  		6149
  	],
  	[
  		7379,
  		7379
  	],
  	[
  		7393,
  		7393
  	],
  	[
  		7401,
  		7404
  	],
  	[
  		7406,
  		7411
  	],
  	[
  		7413,
  		7415
  	],
  	[
  		7418,
  		7418
  	],
  	[
  		8192,
  		8203
  	],
  	[
  		8206,
  		8292
  	],
  	[
  		8294,
  		8304
  	],
  	[
  		8308,
  		8318
  	],
  	[
  		8320,
  		8334
  	],
  	[
  		8352,
  		8383
  	],
  	[
  		8448,
  		8485
  	],
  	[
  		8487,
  		8489
  	],
  	[
  		8492,
  		8497
  	],
  	[
  		8499,
  		8525
  	],
  	[
  		8527,
  		8543
  	],
  	[
  		8585,
  		8587
  	],
  	[
  		8592,
  		9254
  	],
  	[
  		9280,
  		9290
  	],
  	[
  		9312,
  		10239
  	],
  	[
  		10496,
  		11123
  	],
  	[
  		11126,
  		11157
  	],
  	[
  		11159,
  		11263
  	],
  	[
  		11776,
  		11858
  	],
  	[
  		12272,
  		12283
  	],
  	[
  		12288,
  		12292
  	],
  	[
  		12294,
  		12294
  	],
  	[
  		12296,
  		12320
  	],
  	[
  		12336,
  		12343
  	],
  	[
  		12348,
  		12351
  	],
  	[
  		12443,
  		12444
  	],
  	[
  		12448,
  		12448
  	],
  	[
  		12539,
  		12540
  	],
  	[
  		12688,
  		12703
  	],
  	[
  		12736,
  		12771
  	],
  	[
  		12832,
  		12895
  	],
  	[
  		12927,
  		13007
  	],
  	[
  		13055,
  		13055
  	],
  	[
  		13144,
  		13311
  	],
  	[
  		19904,
  		19967
  	],
  	[
  		42752,
  		42785
  	],
  	[
  		42888,
  		42890
  	],
  	[
  		43056,
  		43065
  	],
  	[
  		43310,
  		43310
  	],
  	[
  		43471,
  		43471
  	],
  	[
  		43867,
  		43867
  	],
  	[
  		43882,
  		43883
  	],
  	[
  		64830,
  		64831
  	],
  	[
  		65040,
  		65049
  	],
  	[
  		65072,
  		65106
  	],
  	[
  		65108,
  		65126
  	],
  	[
  		65128,
  		65131
  	],
  	[
  		65279,
  		65279
  	],
  	[
  		65281,
  		65312
  	],
  	[
  		65339,
  		65344
  	],
  	[
  		65371,
  		65381
  	],
  	[
  		65392,
  		65392
  	],
  	[
  		65438,
  		65439
  	],
  	[
  		65504,
  		65510
  	],
  	[
  		65512,
  		65518
  	],
  	[
  		65529,
  		65533
  	],
  	[
  		65792,
  		65794
  	],
  	[
  		65799,
  		65843
  	],
  	[
  		65847,
  		65855
  	],
  	[
  		65936,
  		65948
  	],
  	[
  		66000,
  		66044
  	],
  	[
  		66273,
  		66299
  	],
  	[
  		94178,
  		94179
  	],
  	[
  		113824,
  		113827
  	],
  	[
  		118784,
  		119029
  	],
  	[
  		119040,
  		119078
  	],
  	[
  		119081,
  		119142
  	],
  	[
  		119146,
  		119162
  	],
  	[
  		119171,
  		119172
  	],
  	[
  		119180,
  		119209
  	],
  	[
  		119214,
  		119272
  	],
  	[
  		119520,
  		119539
  	],
  	[
  		119552,
  		119638
  	],
  	[
  		119648,
  		119672
  	],
  	[
  		119808,
  		119892
  	],
  	[
  		119894,
  		119964
  	],
  	[
  		119966,
  		119967
  	],
  	[
  		119970,
  		119970
  	],
  	[
  		119973,
  		119974
  	],
  	[
  		119977,
  		119980
  	],
  	[
  		119982,
  		119993
  	],
  	[
  		119995,
  		119995
  	],
  	[
  		119997,
  		120003
  	],
  	[
  		120005,
  		120069
  	],
  	[
  		120071,
  		120074
  	],
  	[
  		120077,
  		120084
  	],
  	[
  		120086,
  		120092
  	],
  	[
  		120094,
  		120121
  	],
  	[
  		120123,
  		120126
  	],
  	[
  		120128,
  		120132
  	],
  	[
  		120134,
  		120134
  	],
  	[
  		120138,
  		120144
  	],
  	[
  		120146,
  		120485
  	],
  	[
  		120488,
  		120779
  	],
  	[
  		120782,
  		120831
  	],
  	[
  		126065,
  		126132
  	],
  	[
  		126209,
  		126269
  	],
  	[
  		126976,
  		127019
  	],
  	[
  		127024,
  		127123
  	],
  	[
  		127136,
  		127150
  	],
  	[
  		127153,
  		127167
  	],
  	[
  		127169,
  		127183
  	],
  	[
  		127185,
  		127221
  	],
  	[
  		127232,
  		127405
  	],
  	[
  		127462,
  		127487
  	],
  	[
  		127489,
  		127490
  	],
  	[
  		127504,
  		127547
  	],
  	[
  		127552,
  		127560
  	],
  	[
  		127568,
  		127569
  	],
  	[
  		127584,
  		127589
  	],
  	[
  		127744,
  		128727
  	],
  	[
  		128736,
  		128748
  	],
  	[
  		128752,
  		128764
  	],
  	[
  		128768,
  		128883
  	],
  	[
  		128896,
  		128984
  	],
  	[
  		128992,
  		129003
  	],
  	[
  		129024,
  		129035
  	],
  	[
  		129040,
  		129095
  	],
  	[
  		129104,
  		129113
  	],
  	[
  		129120,
  		129159
  	],
  	[
  		129168,
  		129197
  	],
  	[
  		129200,
  		129201
  	],
  	[
  		129280,
  		129400
  	],
  	[
  		129402,
  		129483
  	],
  	[
  		129485,
  		129619
  	],
  	[
  		129632,
  		129645
  	],
  	[
  		129648,
  		129652
  	],
  	[
  		129656,
  		129658
  	],
  	[
  		129664,
  		129670
  	],
  	[
  		129680,
  		129704
  	],
  	[
  		129712,
  		129718
  	],
  	[
  		129728,
  		129730
  	],
  	[
  		129744,
  		129750
  	],
  	[
  		129792,
  		129938
  	],
  	[
  		129940,
  		129994
  	],
  	[
  		130032,
  		130041
  	],
  	[
  		917505,
  		917505
  	],
  	[
  		917536,
  		917631
  	]
  ],
  	"Script/Old_Sogdian": [
  	[
  		69376,
  		69415
  	]
  ],
  	"Script/Imperial_Aramaic": [
  	[
  		67648,
  		67669
  	],
  	[
  		67671,
  		67679
  	]
  ],
  	"Script/Linear_B": [
  	[
  		65536,
  		65547
  	],
  	[
  		65549,
  		65574
  	],
  	[
  		65576,
  		65594
  	],
  	[
  		65596,
  		65597
  	],
  	[
  		65599,
  		65613
  	],
  	[
  		65616,
  		65629
  	],
  	[
  		65664,
  		65786
  	]
  ],
  	"Script/Meroitic_Cursive": [
  	[
  		68000,
  		68023
  	],
  	[
  		68028,
  		68047
  	],
  	[
  		68050,
  		68095
  	]
  ],
  	"Script/Kharoshthi": [
  	[
  		68096,
  		68099
  	],
  	[
  		68101,
  		68102
  	],
  	[
  		68108,
  		68115
  	],
  	[
  		68117,
  		68119
  	],
  	[
  		68121,
  		68149
  	],
  	[
  		68152,
  		68154
  	],
  	[
  		68159,
  		68168
  	],
  	[
  		68176,
  		68184
  	]
  ],
  	"Script/New_Tai_Lue": [
  	[
  		6528,
  		6571
  	],
  	[
  		6576,
  		6601
  	],
  	[
  		6608,
  		6618
  	],
  	[
  		6622,
  		6623
  	]
  ],
  	"Script/Tagalog": [
  	[
  		5888,
  		5900
  	],
  	[
  		5902,
  		5908
  	]
  ],
  	"Script/Yi": [
  	[
  		40960,
  		42124
  	],
  	[
  		42128,
  		42182
  	]
  ],
  	"Script/Georgian": [
  	[
  		4256,
  		4293
  	],
  	[
  		4295,
  		4295
  	],
  	[
  		4301,
  		4301
  	],
  	[
  		4304,
  		4346
  	],
  	[
  		4348,
  		4351
  	],
  	[
  		7312,
  		7354
  	],
  	[
  		7357,
  		7359
  	],
  	[
  		11520,
  		11557
  	],
  	[
  		11559,
  		11559
  	],
  	[
  		11565,
  		11565
  	]
  ],
  	"Script/Balinese": [
  	[
  		6912,
  		6987
  	],
  	[
  		6992,
  		7036
  	]
  ],
  	"Script/Kannada": [
  	[
  		3200,
  		3212
  	],
  	[
  		3214,
  		3216
  	],
  	[
  		3218,
  		3240
  	],
  	[
  		3242,
  		3251
  	],
  	[
  		3253,
  		3257
  	],
  	[
  		3260,
  		3268
  	],
  	[
  		3270,
  		3272
  	],
  	[
  		3274,
  		3277
  	],
  	[
  		3285,
  		3286
  	],
  	[
  		3294,
  		3294
  	],
  	[
  		3296,
  		3299
  	],
  	[
  		3302,
  		3311
  	],
  	[
  		3313,
  		3314
  	]
  ],
  	"Script/Khitan_Small_Script": [
  	[
  		94180,
  		94180
  	],
  	[
  		101120,
  		101589
  	]
  ],
  	"Script/Tai_Le": [
  	[
  		6480,
  		6509
  	],
  	[
  		6512,
  		6516
  	]
  ],
  	"Script/Chakma": [
  	[
  		69888,
  		69940
  	],
  	[
  		69942,
  		69959
  	]
  ],
  	"Script/Arabic": [
  	[
  		1536,
  		1540
  	],
  	[
  		1542,
  		1547
  	],
  	[
  		1549,
  		1562
  	],
  	[
  		1564,
  		1564
  	],
  	[
  		1566,
  		1566
  	],
  	[
  		1568,
  		1599
  	],
  	[
  		1601,
  		1610
  	],
  	[
  		1622,
  		1647
  	],
  	[
  		1649,
  		1756
  	],
  	[
  		1758,
  		1791
  	],
  	[
  		1872,
  		1919
  	],
  	[
  		2208,
  		2228
  	],
  	[
  		2230,
  		2247
  	],
  	[
  		2259,
  		2273
  	],
  	[
  		2275,
  		2303
  	],
  	[
  		64336,
  		64449
  	],
  	[
  		64467,
  		64829
  	],
  	[
  		64848,
  		64911
  	],
  	[
  		64914,
  		64967
  	],
  	[
  		65008,
  		65021
  	],
  	[
  		65136,
  		65140
  	],
  	[
  		65142,
  		65276
  	],
  	[
  		69216,
  		69246
  	],
  	[
  		126464,
  		126467
  	],
  	[
  		126469,
  		126495
  	],
  	[
  		126497,
  		126498
  	],
  	[
  		126500,
  		126500
  	],
  	[
  		126503,
  		126503
  	],
  	[
  		126505,
  		126514
  	],
  	[
  		126516,
  		126519
  	],
  	[
  		126521,
  		126521
  	],
  	[
  		126523,
  		126523
  	],
  	[
  		126530,
  		126530
  	],
  	[
  		126535,
  		126535
  	],
  	[
  		126537,
  		126537
  	],
  	[
  		126539,
  		126539
  	],
  	[
  		126541,
  		126543
  	],
  	[
  		126545,
  		126546
  	],
  	[
  		126548,
  		126548
  	],
  	[
  		126551,
  		126551
  	],
  	[
  		126553,
  		126553
  	],
  	[
  		126555,
  		126555
  	],
  	[
  		126557,
  		126557
  	],
  	[
  		126559,
  		126559
  	],
  	[
  		126561,
  		126562
  	],
  	[
  		126564,
  		126564
  	],
  	[
  		126567,
  		126570
  	],
  	[
  		126572,
  		126578
  	],
  	[
  		126580,
  		126583
  	],
  	[
  		126585,
  		126588
  	],
  	[
  		126590,
  		126590
  	],
  	[
  		126592,
  		126601
  	],
  	[
  		126603,
  		126619
  	],
  	[
  		126625,
  		126627
  	],
  	[
  		126629,
  		126633
  	],
  	[
  		126635,
  		126651
  	],
  	[
  		126704,
  		126705
  	]
  ],
  	"Script/Gothic": [
  	[
  		66352,
  		66378
  	]
  ],
  	"Script/Khmer": [
  	[
  		6016,
  		6109
  	],
  	[
  		6112,
  		6121
  	],
  	[
  		6128,
  		6137
  	],
  	[
  		6624,
  		6655
  	]
  ],
  	"Script/Old_North_Arabian": [
  	[
  		68224,
  		68255
  	]
  ],
  	"Script/Inherited": [
  	[
  		768,
  		879
  	],
  	[
  		1157,
  		1158
  	],
  	[
  		1611,
  		1621
  	],
  	[
  		1648,
  		1648
  	],
  	[
  		2385,
  		2388
  	],
  	[
  		6832,
  		6848
  	],
  	[
  		7376,
  		7378
  	],
  	[
  		7380,
  		7392
  	],
  	[
  		7394,
  		7400
  	],
  	[
  		7405,
  		7405
  	],
  	[
  		7412,
  		7412
  	],
  	[
  		7416,
  		7417
  	],
  	[
  		7616,
  		7673
  	],
  	[
  		7675,
  		7679
  	],
  	[
  		8204,
  		8205
  	],
  	[
  		8400,
  		8432
  	],
  	[
  		12330,
  		12333
  	],
  	[
  		12441,
  		12442
  	],
  	[
  		65024,
  		65039
  	],
  	[
  		65056,
  		65069
  	],
  	[
  		66045,
  		66045
  	],
  	[
  		66272,
  		66272
  	],
  	[
  		70459,
  		70459
  	],
  	[
  		119143,
  		119145
  	],
  	[
  		119163,
  		119170
  	],
  	[
  		119173,
  		119179
  	],
  	[
  		119210,
  		119213
  	],
  	[
  		917760,
  		917999
  	]
  ],
  	"Script/Hiragana": [
  	[
  		12353,
  		12438
  	],
  	[
  		12445,
  		12447
  	],
  	[
  		110593,
  		110878
  	],
  	[
  		110928,
  		110930
  	],
  	[
  		127488,
  		127488
  	]
  ],
  	"Script/Khojki": [
  	[
  		70144,
  		70161
  	],
  	[
  		70163,
  		70206
  	]
  ],
  	"Script/Palmyrene": [
  	[
  		67680,
  		67711
  	]
  ],
  	"Script/Bassa_Vah": [
  	[
  		92880,
  		92909
  	],
  	[
  		92912,
  		92917
  	]
  ],
  	"Script/Cypriot": [
  	[
  		67584,
  		67589
  	],
  	[
  		67592,
  		67592
  	],
  	[
  		67594,
  		67637
  	],
  	[
  		67639,
  		67640
  	],
  	[
  		67644,
  		67644
  	],
  	[
  		67647,
  		67647
  	]
  ],
  	"Script/Nko": [
  	[
  		1984,
  		2042
  	],
  	[
  		2045,
  		2047
  	]
  ],
  	"Script/Latin": [
  	[
  		65,
  		90
  	],
  	[
  		97,
  		122
  	],
  	[
  		170,
  		170
  	],
  	[
  		186,
  		186
  	],
  	[
  		192,
  		214
  	],
  	[
  		216,
  		246
  	],
  	[
  		248,
  		696
  	],
  	[
  		736,
  		740
  	],
  	[
  		7424,
  		7461
  	],
  	[
  		7468,
  		7516
  	],
  	[
  		7522,
  		7525
  	],
  	[
  		7531,
  		7543
  	],
  	[
  		7545,
  		7614
  	],
  	[
  		7680,
  		7935
  	],
  	[
  		8305,
  		8305
  	],
  	[
  		8319,
  		8319
  	],
  	[
  		8336,
  		8348
  	],
  	[
  		8490,
  		8491
  	],
  	[
  		8498,
  		8498
  	],
  	[
  		8526,
  		8526
  	],
  	[
  		8544,
  		8584
  	],
  	[
  		11360,
  		11391
  	],
  	[
  		42786,
  		42887
  	],
  	[
  		42891,
  		42943
  	],
  	[
  		42946,
  		42954
  	],
  	[
  		42997,
  		43007
  	],
  	[
  		43824,
  		43866
  	],
  	[
  		43868,
  		43876
  	],
  	[
  		43878,
  		43881
  	],
  	[
  		64256,
  		64262
  	],
  	[
  		65313,
  		65338
  	],
  	[
  		65345,
  		65370
  	]
  ],
  	"Script/Greek": [
  	[
  		880,
  		883
  	],
  	[
  		885,
  		887
  	],
  	[
  		890,
  		893
  	],
  	[
  		895,
  		895
  	],
  	[
  		900,
  		900
  	],
  	[
  		902,
  		902
  	],
  	[
  		904,
  		906
  	],
  	[
  		908,
  		908
  	],
  	[
  		910,
  		929
  	],
  	[
  		931,
  		993
  	],
  	[
  		1008,
  		1023
  	],
  	[
  		7462,
  		7466
  	],
  	[
  		7517,
  		7521
  	],
  	[
  		7526,
  		7530
  	],
  	[
  		7615,
  		7615
  	],
  	[
  		7936,
  		7957
  	],
  	[
  		7960,
  		7965
  	],
  	[
  		7968,
  		8005
  	],
  	[
  		8008,
  		8013
  	],
  	[
  		8016,
  		8023
  	],
  	[
  		8025,
  		8025
  	],
  	[
  		8027,
  		8027
  	],
  	[
  		8029,
  		8029
  	],
  	[
  		8031,
  		8061
  	],
  	[
  		8064,
  		8116
  	],
  	[
  		8118,
  		8132
  	],
  	[
  		8134,
  		8147
  	],
  	[
  		8150,
  		8155
  	],
  	[
  		8157,
  		8175
  	],
  	[
  		8178,
  		8180
  	],
  	[
  		8182,
  		8190
  	],
  	[
  		8486,
  		8486
  	],
  	[
  		43877,
  		43877
  	],
  	[
  		65856,
  		65934
  	],
  	[
  		65952,
  		65952
  	],
  	[
  		119296,
  		119365
  	]
  ],
  	"Script/Linear_A": [
  	[
  		67072,
  		67382
  	],
  	[
  		67392,
  		67413
  	],
  	[
  		67424,
  		67431
  	]
  ],
  	"Script/Armenian": [
  	[
  		1329,
  		1366
  	],
  	[
  		1369,
  		1418
  	],
  	[
  		1421,
  		1423
  	],
  	[
  		64275,
  		64279
  	]
  ],
  	"Script/Old_Italic": [
  	[
  		66304,
  		66339
  	],
  	[
  		66349,
  		66351
  	]
  ],
  	"Script/Caucasian_Albanian": [
  	[
  		66864,
  		66915
  	],
  	[
  		66927,
  		66927
  	]
  ],
  	"Script/Modi": [
  	[
  		71168,
  		71236
  	],
  	[
  		71248,
  		71257
  	]
  ],
  	"Script/Takri": [
  	[
  		71296,
  		71352
  	],
  	[
  		71360,
  		71369
  	]
  ],
  	"Script/Mende_Kikakui": [
  	[
  		124928,
  		125124
  	],
  	[
  		125127,
  		125142
  	]
  ],
  	"Script/Hebrew": [
  	[
  		1425,
  		1479
  	],
  	[
  		1488,
  		1514
  	],
  	[
  		1519,
  		1524
  	],
  	[
  		64285,
  		64310
  	],
  	[
  		64312,
  		64316
  	],
  	[
  		64318,
  		64318
  	],
  	[
  		64320,
  		64321
  	],
  	[
  		64323,
  		64324
  	],
  	[
  		64326,
  		64335
  	]
  ],
  	"Script/Lepcha": [
  	[
  		7168,
  		7223
  	],
  	[
  		7227,
  		7241
  	],
  	[
  		7245,
  		7247
  	]
  ],
  	"Script/Phags_Pa": [
  	[
  		43072,
  		43127
  	]
  ],
  	"Script/Lydian": [
  	[
  		67872,
  		67897
  	],
  	[
  		67903,
  		67903
  	]
  ],
  	"Script/Buginese": [
  	[
  		6656,
  		6683
  	],
  	[
  		6686,
  		6687
  	]
  ],
  	"Script/Saurashtra": [
  	[
  		43136,
  		43205
  	],
  	[
  		43214,
  		43225
  	]
  ],
  	"Script/Hanifi_Rohingya": [
  	[
  		68864,
  		68903
  	],
  	[
  		68912,
  		68921
  	]
  ],
  	"Script/Glagolitic": [
  	[
  		11264,
  		11310
  	],
  	[
  		11312,
  		11358
  	],
  	[
  		122880,
  		122886
  	],
  	[
  		122888,
  		122904
  	],
  	[
  		122907,
  		122913
  	],
  	[
  		122915,
  		122916
  	],
  	[
  		122918,
  		122922
  	]
  ],
  	"Script/Sinhala": [
  	[
  		3457,
  		3459
  	],
  	[
  		3461,
  		3478
  	],
  	[
  		3482,
  		3505
  	],
  	[
  		3507,
  		3515
  	],
  	[
  		3517,
  		3517
  	],
  	[
  		3520,
  		3526
  	],
  	[
  		3530,
  		3530
  	],
  	[
  		3535,
  		3540
  	],
  	[
  		3542,
  		3542
  	],
  	[
  		3544,
  		3551
  	],
  	[
  		3558,
