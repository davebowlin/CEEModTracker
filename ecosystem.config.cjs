module.exports = {
  apps: [
    {
      name: "ceemodtracker",
      script: "dist/server/index.js",
      cwd: "/path_to_remote_repo_directory",
      env: {
        NODE_ENV: "production",
        PORT: 8082
      }
    }
  ]
};
