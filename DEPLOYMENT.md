# CENOP production

Official application URL: https://admincenop.amseguridad.com.ar

Lovable synchronizes source changes to the main branch of this repository.
Every push to main runs .github/workflows/azure-static-web-apps.yml and
publishes the application to the existing Azure Static Web App
am-seguridad-cenop. Publishing takes a few minutes; check GitHub Actions
for the deployment result before announcing an update.

Azure deployment credentials belong in the repository Actions secret
AZURE_STATIC_WEB_APPS_API_TOKEN, never in source code.

The build uses the same Vite configuration as Lovable, including the
existing Azure data connection. Do not substitute a different data source
when deploying. The Lovable preview and its published URL remain separate
hosting endpoints; share the official application URL with users.
