// ---------------------------------------------------------------------
var ls_running       = false;
var ls_total_emails  = 0;
var ls_emails_sent   = 0;
var ls_destinatarios = [];

// ---------------------------------------------------------------------
async function save_state() {
    /* Função responsável por salvar o valor atual das variáveis globais no localStorage. */

    await messenger.storage.local.set({
        running: ls_running,
        total_emails: ls_total_emails,
        emails_sent: ls_emails_sent,
        destinatarios: ls_destinatarios,
    });
}

async function update_state(running, total_emails, emails_sent, destinatarios) {
    /* Função responsável por atualizar as variáveis globais, conforme parâmetros, e solicitar a atualização no localStorage. */

    if (running) {
        ls_running = running;
    }
    if (total_emails) {
        ls_total_emails = total_emails;
    }
    if (emails_sent) {
        ls_emails_sent = emails_sent;
    }
    if (destinatarios) {
        ls_destinatarios = destinatarios;
    }

    await save_state();
}

async function send_message_frontend(value) {
    /* Função responsável por enviar uma mensagem para o FrontEnd */
    try {
        await messenger.runtime.sendMessage({ status: value });
    } catch (error) {
        // console.log(`Erro ao enviar mensagem ao frontend: |${error}|.`);
    }
}

async function getSelectedEmails() {
    /* Função responsável por recuperar as mensagens selecionadas pelo usuário. */

    let tabs = await messenger.tabs.query({
        active: true,
        currentWindow: true,
    });
    let selected_messages = await messenger.mailTabs.getSelectedMessages(
        tabs[0].id
    );

    selected_messages = selected_messages.messages;

    return selected_messages;
}

async function forwardEmail(message, email_index) {
    /* Função responsável por efetivamente encaminhar um e-mail. */

    let promise = new Promise(async (resolve, reject) => {
        try {
            // Recupera informações do remetente:
            let account = await messenger.accounts.get(
                message.folder.accountId
            );
            let identity = account.identities[0];

            // Abre uma janela de encaminhamento de e-mails:
            let tab_forward = await messenger.compose.beginForward(
                message.id,
                "forwardInline",
                {
                    to: ls_destinatarios,
                    from: identity.email,
                    identityId: identity.id,
                }
            );

            // Minimiza a janela:
            let window = await messenger.windows.get(tab_forward.windowId); // Recupera a janela
            window = await messenger.windows.update(window.id, {
                state: "minimized",
            }); // Minimiza a janela

            // Envia o e-mail:
            await messenger.compose.sendMessage(tab_forward.id, {
                mode: "sendNow",
            }); // Efetivamente envia o e-mail

            // Atualiza variáveis globais e localStorage:
            await update_state(
                ls_running,
                ls_total_emails,
                ls_emails_sent + 1,
                ls_destinatarios
            );
            console.log(
                `E-mail ${email_index} enviado com sucesso (${ls_emails_sent}/${ls_total_emails});`
            );

            // Informa ao frontend:
            send_message_frontend("sent");
        } catch (error) {
            console.log(
                `Erro ao encaminhar o e-mail ${email_index}: |${error}|;`
            );
            reject(error);
        }

        // Fim da Promisse
        resolve();
    });

    return promise;
}

async function forwardSelectedEmails(destinatarios) {
    /* Função responsável por coordenar o encaminhamento dos e-mails selecionados. */

    // Recupera os e-mails selecionados:
    let selected_messages = await getSelectedEmails();
    // console.log("E-mails selecionados", selected_messages);

    // Atualiza variáveis globais e localStorage:
    await update_state(true, selected_messages.length, 0, destinatarios);

    // Cria as promises de encaminhamento de e-mail:
    let promises = selected_messages.map((message, i) =>
        forwardEmail(message, i)
    );
    // console.log("Promises criadas", promises);

    // Executa todas as promises:
    await Promise.all(promises)
        .then(() => {
            console.log("Todos e-mails enviados com sucesso;");
        })
        .catch((error) => {
            console.log(`Erro ao enviar e-mail: |${error}|.`);
        });
    // console.log("Promises executadas");

    // Atualiza variáveis globais e localStorage:
    await update_state(
        false,
        ls_total_emails,
        ls_emails_sent,
        ls_destinatarios
    );
    await send_message_frontend("done");
    // console.log("Fim do forwardSelectedEmails");
}

// ---------------------------------------------------------------------
messenger.runtime.onMessage.addListener(async (message) => {
    if (message.action === "start") {
        await forwardSelectedEmails(message.destinatarios);
    }
});

// ---------------------------------------------------------------------
