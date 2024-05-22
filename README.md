# Couchbase Search Blog API

This Express server provides an API that exposes a Couchbase vector search of a database bucket. It can be used in conjunction with a static blog site to give it an endpoint to fetch search data.

## Prerequisites

Before running the server, make sure you have the following installed:

- Node.js
- Couchbase Server

## Installation

1. Clone this repository:

    ```bash
    git clone https://github.com/hummusonrails/couchbase-search-blog.git
    ```

2. Install the dependencies:

    ```bash
    cd couchbase-search-blog
    npm install
    ```

3. Configure the Couchbase connection:

    Open the `.env.example` file and update the environment variables with your Couchbase and OpenAI credentials.

## Usage

To start the server, run the following command:

```bash
node server.js
```

The server will start on port 3000 by default.

## API

### `GET /search?q={query}`

Searches the blog database for posts that match the query.

#### Parameters

- `q`: The search query.

#### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": "post-id",
      "title": "Post Title",
      "summary": "Post Summary",
      "tags": ["tag1", "tag2"],
      "date": "2021-01-01T00:00:00.000Z"
    }
  ]
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.