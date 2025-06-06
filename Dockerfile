FROM node:24

# Note: This application requires certain environment variables to be set in
#   order to run correctly.  These variables should either be passed using the
#   -e flag when running the container, or set in the docker-compose file.
#
#   The required variables are:
#
#   PUBLIC_COGNITO_AUTHORITY - The Cognito Identity Provider URL.
#   PUBLIC_COGNITO_CLIENT_ID - The client ID for your Cognito application.
#   PUBLIC_CONGNITO_REDIRECT_URI - The redirect URI used for PKCE authentication.
#

# Set the working directory
WORKDIR /app

# Copy contents
COPY . .
RUN npm install --force

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose port used by HTTP application
EXPOSE 3000

# Build a development version
RUN npm run build

# Start application
CMD ["node", "build"]
