---
title: GET
linkTitle: GET
description: GET
menu:
  v1.0:
    parent: api-redis
    weight: 2070
---

## Synopsis
<b>`GET key`</b><br>
This command fetches the value that is associated with the given `key`.

<li>If the `key` does not exist, null is returned.</li>
<li>If the `key` is associated with a non-string value, an error is raised.</li>

## Return Value
Returns string value of the given `key`.

## Examples

You can do this as shown below.

```sh
$ GET yugakey
```

```
(null)
```

```sh
$ SET yugakey "Yugabyte"
```

```
"OK"
```

```sh
$ GET yugakey
```

```
"Yugabyte"
```

## See Also
[`append`](../append/), [`getrange`](../getrange/), [`getset`](../getset/), [`incr`](../incr/), [`incrby`](../incrby/), [`set`](../set/), [`setrange`](../setrange/), [`strlen`](../strlen/)
