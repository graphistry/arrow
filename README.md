# Node Arrow Bindings
[Graphistry's](https://www.graphistry.com) production JavaScript Arrow bindings, `@graphistry/arrow`, provide an easy yet efficient interface for manipulating [Apache Arrow](https://github.com/apache/arrow) dataframe buffers. 

Loading big native dataframe data in JavaScript is now awesome. `@graphistry/arrow` exposes a single unified iterable interface for zero-copy access to different kinds of Arrow data: both for CPU and GPU buffers [GoAI](http://gpuopenanalytics.com/), and both File and Streaming mode. 

The initial published backend engine only supports CPU mode for File mode.  Build targets include node + browser, and most modern module formats. It is tested with MapD-generated Arrow files and Apache's Arrow samples, and in use as part of Graphistry's GPU visual analytics platform.

# Related Projects
* [Apache Arrow](https://github.com/apache/arrow) -- Arrow dataframe format
* [GoAI](http://gpuopenanalytics.com/) -- Arrow standard extension for GPUs
* [RxJS-MapD](https://github.com/graphistry/rxjs-mapd) -- Library to get Arrow buffores from MapD into Node

# Why 
Node should be able to access data tables from big data systems in a friendly, modern, and zero-copy way. Arrow is the emerging standard for large in-memory data tables (Spark, Pandas, Drill, ...), but dealing with details like record batches within node client code is annoying.

# Architecture & Performance

TODO

# Install

`npm install @graphistry/arrow`

# Contribute

See [develop.md](https://github.com/graphistry/arrow/blob/master/develop.md)

PR's welcome! Some easy first ideas:

* API docs
* Benchmarks
* Tests
* More value types: map, ...
* More variants: Streaming mode and GPU mode
* Optimizations


# Examples

## Vectors are what you expect
```
import { readFileSync } from 'fs';
import { readBuffers } from '@graphistry/arrow';
for (let vectors of readBuffers([ readFileSync('some.arrow') ])) {
  for (let vector of vectors) {
      let myTypedArrayCopy = vector.slice();
      for (let i = -1, n = vector.length; ++i < n;) {
        assert(vector.get(i) === myTypedArrayCopy[i])
      }
  }
}
```

## MapD Interop

```
import Client from 'rxjs-mapd';
const host = `localhost`, port = 9091, encrypted = false;
const username = `mapd`, password = `HyperInteractive`, dbName = `mapd`, timeout = 5000;
const BoundClient = Client.open(host, port, encrypted);
const mapdSessions = BoundClient.connect(dbName, username, password, timeout);
mapdSessions
    .flatMap((session) => session
        .queryDF(`SELECT count(*) as row_count FROM flights_2008_10k`)
        .disconnect()
    ).subscribe(printArrowTable, (err) => console.error(err));
```

# API

TODO

# License

[Apache 2.0](https://github.com/graphistry/arrow/blob/master/LICENSE)




