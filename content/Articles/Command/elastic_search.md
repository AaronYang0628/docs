+++
title = 'Elastic Search DSL'
date = 2024-10-07T19:58:45+08:00
weight = 6
+++

### Basic Query
{{< tabs title="exist query" >}}
{{% tab title="normal" %}}
Returns documents that contain an indexed value for a `field`.
```bash
GET /_search
{
  "query": {
    "exists": {
      "field": "user"
    }
  }
}
```
{{% /tab %}}
{{% tab title="advanced" %}}
The following search returns documents that are __missing an indexed value__ for the `user.id` field.
```bash
GET /_search
{
  "query": {
    "bool": {
      "must_not": {
        "exists": {
          "field": "user.id"
        }
      }
    }
  }
}
```
{{% /tab %}}
{{< /tabs >}}

{{< tabs title="fuzz query" >}}
{{% tab title="normal" %}}
Returns documents that contain terms similar to the search term, as measured by a Levenshtein edit distance.
```bash
GET /_search
{
  "query": {
    "fuzzy": {
      "filed_A": {
        "value": "ki"
      }
    }
  }
}
```
{{% /tab %}}
{{% tab title="advanced" %}}
Returns documents that contain terms similar to the search term, as measured by a Levenshtein edit distance.
```bash
GET /_search
{
  "query": {
    "fuzzy": {
      "filed_A": {
        "value": "ki",
        "fuzziness": "AUTO",
        "max_expansions": 50,
        "prefix_length": 0,
        "transpositions": true,
        "rewrite": "constant_score_blended"
      }
    }
  }
}
```
 > rewrite: 
 - constant_score_boolean
 - constant_score_filter
 - top_terms_blended_freqs_N
 - top_terms_boost_N, top_terms_N
 - frequent_terms, score_delegating
{{% /tab %}}
{{< /tabs >}}

{{< tabs title="ids query" >}}
{{% tab title="normal" %}}
Returns documents based on their IDs. This query uses document IDs stored in the `_id` field.
```bash
GET /_search
{
  "query": {
    "ids" : {
      "values" : ["2NTC5ZIBNLuBWC6V5_0Y"]
    }
  }
}
```
{{% /tab %}}
{{< /tabs >}}

{{< tabs title="prefix query" >}}
{{% tab title="normal" %}}
The following search returns documents where the `filed_A` field contains a term that begins with `ki`.
```bash
GET /_search
{
  "query": {
    "prefix": {
      "filed_A": {
        "value": "ki",
         "rewrite": "constant_score_blended",
         "case_insensitive": true
      }
    }
  }
}
```
{{% /tab %}}
{{% tab title="simplify prefix query" %}}
You can simplify the prefix query syntax by combining the `<field>` and `value` parameters.
```bash
GET /_search
{
  "query": {
    "prefix" : { "filed_A" : "ki" }
  }
}
```
{{% /tab %}}
{{< /tabs >}}


{{< tabs title="range query" >}}
{{% tab title="with boost" %}}
Returns documents that contain terms within a provided range.
```bash
GET /_search
{
  "query": {
    "range": {
      "filed_number": {
        "gte": 10,
        "lte": 20,
        "boost": 2.0
      }
    }
  }
}
```
{{% /tab %}}
{{% tab title="within date range" %}}
```bash
GET /_search
{
  "query": {
    "range": {
      "filed_timestamp": {
        "time_zone": "+01:00",        
        "gte": "2020-01-01T00:00:00", 
        "lte": "now"                  
      }
    }
  }
}
```
{{% /tab %}}
{{< /tabs >}}


{{< tabs title="regex query" >}}
{{% tab title="normal" %}}
Returns documents that contain terms matching a regular expression.
```bash
GET /_search
{
  "query": {
    "regexp": {
      "filed_A": {
        "value": "k.*y",
        "flags": "ALL",
        "case_insensitive": true,
        "max_determinized_states": 10000,
        "rewrite": "constant_score_blended"
      }
    }
  }
}
```
{{% /tab %}}
{{< /tabs >}}

{{< tabs title="term query" >}}
{{% tab title="normal" %}}
Returns documents that contain an exact term in a provided field.

You can use the term query to find documents based on a precise value such as a price, a product ID, or a username.
```bash
GET /_search
{
  "query": {
    "term": {
      "filed_A": {
        "value": "kimchy",
        "boost": 1.0
      }
    }
  }
}
```
{{% /tab %}}
{{< /tabs >}}

{{< tabs title="wildcard query" >}}
{{% tab title="normal" %}}
Returns documents that contain terms matching a wildcard pattern.

A wildcard operator is a placeholder that matches one or more characters. For example, the * wildcard operator matches zero or more characters. You can combine wildcard operators with other characters to create a wildcard pattern.
```bash
GET /_search
{
  "query": {
    "wildcard": {
      "filed_A": {
        "value": "ki*y",
        "boost": 1.0,
        "rewrite": "constant_score_blended"
      }
    }
  }
}
```
{{% /tab %}}
{{< /tabs >}}

