### Terminology

Using precise terminology is important so that everyone understands the same concepts when discussing OMSS.

| Term            | Meaning                                                                                                                        |
|:----------------|:-------------------------------------------------------------------------------------------------------------------------------|
| **the spec**    | The current Open Media Streaming Specification (currently v1.1).                                                               |
| **OMSS Plugin** | A plugin that extends the functionality of OMSS Core.                                                                          |
| **Resolver**    | An OMSS Plugin that converts a given ID into usable data for providers.                                                        |
| **ID**          | A unique identifier consisting of a namespace and a value separated by `:`. E.g., `tmdb:12345`.                                |
| **Namespace**   | The portion of an ID identifying which ID-Provider owns the value. E.g., `tmdb`, `imdb`.                                       |
| **ID-Provider** | A third-party service capable of providing metadata for a given ID.                                                            |
| **Provider**    | A file in a consumer repository that receives resolver data and returns streaming sources.                                     |
| **OMSS Server** | The primary class of OMSS Core, responsible for loading and managing plugins.                                                  |
| **Consumer**    | A client application that uses the OMSS Core                                                                                   |
| **Extractor**   | An object that can be injected into the OMSS Server, which contains the logic to extract media from a specific content hoster. |

