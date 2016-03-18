Flow-Based Programming Manifest Tools
=====================================

This repository provides a schema for Flow-Based Programming manifest (`fbp.json`) files, as well as tools for populating and validating them. The purpose of FBP manifest files is to provide a platform-agnostic registry of flow-based components available in a project.

Manifest files can be used by the FBP runtimes themselves for component loading, and is also useful for development tools like [Flowhub](https://flowhub.io) or [DrawFBP](https://github.com/jpaulm/drawfbp).

## Status

Prototyping

## Tools

* `fbp-manifest-list`: Discover available components and list them
* `fbp-manifest-stats`: Show component reuse statistics for a project
* `fbp-manifest-validate`: Validate a FBP manifest file against the schema

## Runtime support

FBP Manifest has been designed to have a plugin architecture where the developers of different flow-based runtimes can add support for their system. See [src/runtimes](https://github.com/flowbased/fbp-manifest/tree/master/src/runtimes) for how to do this. Runtimes can of course also just implement `fbp.json` generation and consumption on their own, and merely utilize the JSON schemas from this project to validate their structure.

Currently supported FBP runtimes are:

* [NoFlo](http://noflojs.org)
* [MsgFlo](https://github.com/msgflo/msgflo)

## Background

* [FBP Protocol: component](http://noflojs.org/documentation/protocol/#component)
* [NoFlo issue 247: FBP project manifest](https://github.com/noflo/noflo/issues/247)
* [FBP Glossary](http://www.jpaulmorrison.com/fbp/gloss.htm)
