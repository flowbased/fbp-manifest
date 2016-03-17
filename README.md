Flow-Based Programming Manifest Tools
=====================================

This repository provides a schema for Flow-Based Programming manifest (`fbp.json`) files, as well as tools for populating and validating them. The purpose of FBP manifest files is to provide a platform-agnostic registry of flow-based components available in a project.

Manifest files can be used by the FBP runtimes themselves for component loading, and is also useful for development tools like [Flowhub](https://flowhub.io) or [DrawFBP](https://github.com/jpaulm/drawfbp).

## Status

Prototyping

## Tools

* `fbp-manifest-validate`: Validate a FBP manifest file against the schema
* `fbp-manifest-list`: Discover available components and list them

## Background

* [FBP Protocol: component](http://noflojs.org/documentation/protocol/#component)
* [NoFlo issue 247: FBP project manifest](https://github.com/noflo/noflo/issues/247)
* [FBP Glossary](http://www.jpaulmorrison.com/fbp/gloss.htm)
