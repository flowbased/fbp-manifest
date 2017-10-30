Flow-Based Programming Manifest Tools [![Build Status](https://travis-ci.org/flowbased/fbp-manifest.svg?branch=master)](https://travis-ci.org/flowbased/fbp-manifest) [![Greenkeeper badge](https://badges.greenkeeper.io/flowbased/fbp-manifest.svg)](https://greenkeeper.io/) [![Coverage Status](https://coveralls.io/repos/github/flowbased/fbp-manifest/badge.svg?branch=master)](https://coveralls.io/github/flowbased/fbp-manifest?branch=master)
=====================================

This repository provides a schema for Flow-Based Programming manifest (`fbp.json`) files, as well as tools for populating and validating them. The purpose of FBP manifest files is to provide a platform-agnostic registry of flow-based components available in a project.

Manifest files can be used by the FBP runtimes themselves for component loading, and is also useful for development tools like [Flowhub](https://flowhub.io) or [DrawFBP](https://github.com/jpaulm/drawfbp).

## Status

Used in production with NoFlo, both for Node.js and for [producing browser builds](https://github.com/noflo/noflo-component-loader).

## Tools

* `fbp-manifest-list`: Discover available components and list them
* `fbp-manifest-deps`: Produce a manifest consisting only of dependencies of a given component
* `fbp-manifest-stats`: Show component reuse statistics for a project
* `fbp-manifest-validate`: Validate a FBP manifest file against the schema

## Runtime support

FBP Manifest has been designed to have a plugin architecture where the developers of different flow-based runtimes can add support for their system. See [src/runtimes](https://github.com/flowbased/fbp-manifest/tree/master/src/runtimes) for how to do this. Runtimes can of course also just implement `fbp.json` generation and consumption on their own, and merely utilize the JSON schemas from this project to validate their structure.

Currently supported FBP runtimes are:

* [NoFlo](http://noflojs.org)
* [MsgFlo](https://github.com/msgflo/msgflo)

## Manifest structure

FBP manifests consist of the following information:

* `version`: version of the manifest specification, currently `1`
* `modules`: array of module definitions
* `main`: (optional) main component definition for running the project

The modules are objects with the following:

* `name`: name of the module
* `runtime`: runtime the module is for, for example `noflo-nodejs`
* `base`: base directory path of the module, relative to project root
* `components`: array of components contained in the module
* `description`: (optional) human-readable description for the module
* `icon`: (optional) default icon for components of the module, following [Font Awesome](http://fontawesome.io/icons/) naming conventions

Modules supporting multiple runtimes can appear multiple times in a manifest, once per each supported runtime. For example a NoFlo module that has some common components, and specific components for Node.js and browsers may have three entries with specific runtimes: `noflo`, `noflo-nodejs`, and `noflo-browser`. A manifest can contain modules for an arbitrary number of different runtimes.

Components are objects with the following:

* `name`: name of the component
* `path`: path used for executing the component. For example a Node.js require path or Java class path
* `exec`: command used for starting an instance of the component for components that are standalone processes
* `elementary`: boolean on whether the component is elementary (code) or not (graph)
* `source`: (optional) path to the source code of the component
* `inports`: (optional) array of inport definitions for the component
* `outports`: (optional) array of outport definitions for the component

Each component needs to provide at minimum the information the runtime needs to run it. Additionally it can provide metadata usable for flow-based programming tools like a ports listing. Either `path` or `exec` needs to be provided.

The full manifest structure can be found in the [schema](https://github.com/flowbased/fbp-manifest/tree/master/schemata). Manifest files can be validated against the JSON schema or with the `fbp-manifest-validate` tool.

### Extending

It is possible to extend the manifest files with custom runtime-specific information. To do this, place the custom values under a key named after the runtime they're for. So, for example NoFlo's custom information about a component would go under a `noflo` key:

```json
{
  "name": "Merge",
  "path": "components/Merge.js",
  "source": "components/Merge.coffee",
  "elementary": true,
  "noflo": {
    "async": false
  }
}
```

## Background

* [FBP Protocol: component](http://noflojs.org/documentation/protocol/#component)
* [NoFlo issue 247: FBP project manifest](https://github.com/noflo/noflo/issues/247)
* [FBP Glossary](http://www.jpaulmorrison.com/fbp/gloss.htm)
