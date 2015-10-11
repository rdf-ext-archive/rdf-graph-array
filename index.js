var rdf = {}

rdf.encodeString = function (s) {
  var out = ''
  var skip = false
  var _g1 = 0
  var _g = s.length

  while (_g1 < _g) {
    var i = _g1++

    if (!skip) {
      var code = s.charCodeAt(i)

      if (code >= 55296 && code <= 56319) {
        var low = s.charCodeAt(i + 1)
        code = (code - 55296) * 1024 + (low - 56320) + 65536
        skip = true
      }

      if (code > 1114111) {
        throw new Error('Char out of range')
      }

      var hex = '00000000'.concat((Number(code)).toString(16).toUpperCase())

      if (code >= 65536) {
        out += '\\' + hex.slice(-8)
      } else {
        if (code >= 127 || code <= 31) {
          switch (code) {
            case 9: out += '\\t'; break
            case 10: out += '\\n'; break
            case 13: out += '\\r'; break
            default: out += '\\u' + hex.slice(-4); break
          }
        } else {
          switch (code) {
            case 34: out += '\\"'; break
            case 92: out += '\\\\'; break
            default: out += s.charAt(i); break
          }
        }
      }
    } else {
      skip = !skip
    }
  }
  return out
}

rdf.NamedNode = function (iri) {
  this.interfaceName = 'NamedNode'
  this.nominalValue = iri
}

rdf.NamedNode.prototype.toString = function () {
  return '<' + rdf.encodeString(this.nominalValue) + '>'
}

rdf.NamedNode.prototype.equals = function (other) {
  if (typeof other === 'string') {
    return this.nominalValue === other
  }

  if (typeof other === 'object') {
    if (other.constructor.name === 'RegExp') {
      return other.test(this.nominalValue)
    }

    if (other.interfaceName === this.interfaceName) {
      return this.nominalValue === other.nominalValue
    }
  }

  return false
}

rdf.BlankNode = function () {
  this.interfaceName = 'BlankNode'
  this.nominalValue = 'b' + (++rdf.BlankNode.nextId)
}

rdf.BlankNode.prototype.toString = function () {
  return '_:' + rdf.encodeString(this.nominalValue)
}

rdf.BlankNode.prototype.equals = function (other) {
  if (typeof other === 'string') {
    return this.nominalValue === other
  }

  if (typeof other === 'object') {
    if (other.constructor.name === 'RegExp') {
      return other.test(this.nominalValue)
    }

    if (other.interfaceName === this.interfaceName) {
      return this.nominalValue === other.nominalValue
    }
  }

  return false
}

rdf.BlankNode.nextId = 0

rdf.Literal = function (value, language, datatype) {
  this.interfaceName = 'Literal'
  this.nominalValue = value

  if (language) {
    this.language = language
    this.datatype = rdf.Literal.langString
  } else {
    this.language = null

    if (datatype) {
      this.datatype = typeof datatype === 'string' ? new rdf.NamedNode(datatype) : datatype
    } else {
      this.datatype = rdf.Literal.string
    }
  }
}

rdf.Literal.prototype.toString = function () {
  var string = '"' + rdf.encodeString(this.nominalValue) + '"'

  if (this.language) {
    string += '@' + this.language
  }

  if (this.datatype && !rdf.Literal.string.equals(this.datatype) && !rdf.Literal.langString.equals(this.datatype)) {
    string += '^^' + this.datatype.toString()
  }

  return string
}

rdf.Literal.prototype.equals = function (other) {
  if (typeof other === 'string') {
    return this.nominalValue === other
  }

  if (typeof other === 'object') {
    if (other.constructor.name === 'RegExp') {
      return other.test(this.nominalValue)
    }

    if (other.interfaceName === this.interfaceName) {
      if (this.nominalValue !== other.nominalValue) {
        return false
      }

      if (this.language !== other.language) {
        return false
      }

      if ((this.datatype && !this.datatype.equals(other.datatype))) {
        return false
      }

      return true
    }
  }

  return false
}

rdf.Literal.langString = new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')
rdf.Literal.string = new rdf.NamedNode('http://www.w3.org/2001/XMLSchema#string')

rdf.Triple = function (subject, predicate, object) {
  this.subject = subject
  this.predicate = predicate
  this.object = object
}

rdf.Triple.prototype.toString = function () {
  return this.subject.toString() + ' ' + this.predicate.toString() + ' ' + this.object.toString() + ' .'
}

rdf.Triple.prototype.equals = function (other) {
  return this.subject.equals(other.subject) && this.predicate.equals(other.predicate) && this.object.equals(other.object)
}

rdf.Triple.prototype.toQuad = function (graph) {
  return new rdf.Quad(this.subject, this.predicate, this.object, graph)
}

rdf.Quad = function (subject, predicate, object, graph) {
  this.subject = subject
  this.predicate = predicate
  this.object = object
  this.graph = graph
}

rdf.Quad.prototype.toString = function () {
  return this.subject.toString() + ' ' + this.predicate.toString() + ' ' + this.object.toString() + ' ' + this.graph.toString() + ' .'
}

rdf.Quad.prototype.equals = function (other) {
  return this.subject.equals(other.subject) && this.predicate.equals(other.predicate) && this.object.equals(other.object) && this.graph.equals(other.graph)
}

rdf.Quad.prototype.toTriple = function () {
  return new rdf.Triple(this.subject, this.predicate, this.object)
}

rdf.Graph = function (array) {
  this.actions = []

  Object.defineProperty(this, 'length', {
    get: function () { return this._graph.length }
  })

  this._graph = []
  this._gspo = {}

  if (array) {
    this.addArray(array)
  }
}

rdf.Graph.prototype.toString = function () {
  return this._graph
    .map(function (quad) {
      return quad.toString()
    })
    .join('\n')
}

rdf.Graph.prototype.equals = function (other) {
  // TODO: implement sync version of http://json-ld.org/spec/latest/rdf-dataset-normalization/
}

rdf.Graph.prototype.add = function (quad) {
  var i = rdf.Graph.index(quad)

  this._gspo[i.g] = this._gspo[i.g] || {}
  this._gspo[i.g][i.s] = this._gspo[i.g][i.s] || {}
  this._gspo[i.g][i.s][i.p] = this._gspo[i.g][i.s][i.p] || {}

  if (!this._gspo[i.g][i.s][i.p][i.o]) {
    this._gspo[i.g][i.s][i.p][i.o] = quad
    this._graph.push(quad)
    this.actions.forEach(function (action) {
      action.run(quad)
    })
  }

  return this
}

rdf.Graph.prototype.addAction = function (action) {
  // TODO: implement me
}

rdf.Graph.prototype.addAll = function (other) {
  var self = this

  other.forEach(function (quad) {
    self.add(quad)
  })

  return this
}

rdf.Graph.prototype.addArray = function (array) {
  var self = this

  array.forEach(function (quad) {
    self.add(quad)
  })

  return this
}

rdf.Graph.prototype.difference = function (other) {
  var difference = new rdf.Graph()

  this.forEach(function (quad) {
    if (!other.includes(quad)) {
      difference.add(quad)
    }
  })

  return difference
};

rdf.Graph.prototype.every = function (callback) {
  return this._graph.every(callback)
}

rdf.Graph.prototype.filter = function (callback) {
  return new rdf.Graph(this._graph.filter(callback))
}

rdf.Graph.prototype.forEach = function (callback) {
  var self = this

  this._graph.forEach(function (quad) {
    callback(quad, self)
  })
}

rdf.Graph.prototype.includes = function (quad) {
  return this.match(quad.subject, quad.predicate, quad.object, quad.graph).length === 1
}

rdf.Graph.prototype.intersection = function (other) {
  var intersection = new rdf.Graph()

  this.forEach(function (quad) {
    if (other.includes(quad)) {
      intersection.add(quad)
    }
  })

  return intersection
}

rdf.Graph.prototype.map = function (callback) {
  var self = this

  return this._graph.map(function (quad) {
    return callback(quad, self)
  })
}

rdf.Graph.prototype.match = function (subject, predicate, object, graph) {
  return new rdf.Graph(this._graph.filter(function (quad) {
    if (graph && (!quad.graph || !quad.graph.equals(graph))) {
      return false
    }

    if (subject && !quad.subject.equals(subject)) {
      return false
    }

    if (predicate && !quad.predicate.equals(predicate)) {
      return false
    }

    if (object && !quad.object.equals(object)) {
      return false
    }

    return true
  }))
}

rdf.Graph.prototype.merge = function (other) {
  return (new rdf.Graph(this.toArray()).addAll(other))
}

rdf.Graph.prototype.remove = function (quad) {
  var i = rdf.Graph.index(quad)

  if (this._gspo[i.g][i.s][i.p][i.o]) {
    delete this._gspo[i.g][i.s][i.p][i.o]
    this._graph.splice(this._graph.indexOf(quad), 1)
  }
}

rdf.Graph.prototype.removeMatches = function (subject, predicate, object, graph) {
  var self = this
  var matches = this.match(subject, predicate, object, graph)

  matches.forEach(function (quad) {
    self.remove(quad)
  })
}

rdf.Graph.prototype.some = function (callback) {
  return this._graph.some(callback)
}

rdf.Graph.prototype.toArray = function () {
  return this._graph.slice(0)
}

rdf.Graph.index = function (quad) {
  return {
    g: quad.graph ? quad.graph.toString() : null,
    s: quad.subject.toString(),
    p: quad.predicate.toString(),
    o: quad.object.toString()
  }
}

module.exports = rdf
