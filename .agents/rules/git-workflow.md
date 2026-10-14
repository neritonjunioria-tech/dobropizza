# Regras de Git e Deploy

1. **Deploy Automático Proibido**: Todo e qualquer deploy (push para a branch `main`) está estritamente bloqueado por padrão.
2. **Autorização Prévia Obrigatória**: O agente NUNCA deve fazer push para a `main` ou disparar deploy de forma autônoma. O push para a `main` só é permitido após o usuário analisar as alterações e dar o comando/autorização explícita (ex: "pode subir", "pode fazer o deploy", "autorizado").
3. **Fluxo Local**: O agente desenvolve localmente, testa e valida o build (`npm run build`), apresenta o resultado e aguarda a autorização do usuário antes de publicar em produção.

