# MedCore schema migrations

`app/main.py` intentionally does not create tables. Apply the SQL files once,
in filename order, using a temporary deploy role. `psql` uses a standard
PostgreSQL URI, so it differs from the application's SQLAlchemy URI by not
including `+psycopg2`:

```powershell
$env:MEDCORE_MIGRATION_DATABASE_URL = 'postgresql://medcore_deploy:replace-me@127.0.0.1:5432/medcore'
Get-ChildItem .\migrations\*.sql | Sort-Object Name | ForEach-Object {
  psql --set ON_ERROR_STOP=1 --dbname $env:MEDCORE_MIGRATION_DATABASE_URL --file $_.FullName
}
```

Back up the production database and rehearse every migration in staging first.
The application account should have only the data permissions it needs after
deployment; migrations should run with a separate, short-lived deploy account.
