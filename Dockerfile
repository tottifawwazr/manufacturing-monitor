# One image serves the built React app and ASP.NET Core API on the same origin.
FROM node:24-bookworm-slim AS frontend
WORKDIR /src/mpms-web
COPY mpms-web/package*.json ./
RUN npm ci
COPY mpms-web/ ./
ARG VITE_API_BASE_URL=/api
ARG VITE_DEMO_READ_ONLY=true
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_DEMO_READ_ONLY=$VITE_DEMO_READ_ONLY
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS backend
WORKDIR /src
COPY ManufacturingMonitor.Api/ManufacturingMonitor.Api.csproj ManufacturingMonitor.Api/
RUN dotnet restore ManufacturingMonitor.Api/ManufacturingMonitor.Api.csproj
COPY ManufacturingMonitor.Api/ ManufacturingMonitor.Api/
RUN dotnet publish ManufacturingMonitor.Api/ManufacturingMonitor.Api.csproj -c Release --no-restore -p:UseAppHost=false -o /publish
COPY --from=frontend /src/mpms-web/dist/ /publish/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
USER root
RUN apt-get update && apt-get install -y --no-install-recommends gosu sqlite3 curl \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -m 0700 -o app -g app /var/lib/mpms
WORKDIR /app
COPY --from=backend /publish/ ./
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod 0755 /entrypoint.sh
ENV ASPNETCORE_ENVIRONMENT=Production ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl --fail --silent -H "Host: ${AllowedHosts%%;*}" http://127.0.0.1:8080/healthz/live || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD []
