// --------------------------------------------------------------------------------------------------------
let running         = false;
let destinatarios   = [];
let total_emails    = 0;
let emails_sent     = 0;

// --------------------------------------------------------------------------------------------------------
async function save_state(){
    await messenger.storage.local.set(
        {
            running:       running,
            destinatarios: destinatarios,
            total_emails:  total_emails,
            emails_sent:   emails_sent
        }
    );
}
  
async function forwardSelectedEmails(dests) {
    let tabs              = await messenger.tabs.query({ active: true, currentWindow: true });

    let selected_messages = await messenger.mailTabs.getSelectedMessages(tabs[0].id);
    selected_messages     = selected_messages.messages;

    running               = true;
    total_emails          = selected_messages.length;
    emails_sent           = 0;
    destinatarios         = dests;
    await save_state();

    for (let i = 0; i < total_emails; i++){
        if (!running){
            console.log("Parando...");
            break;
        }

        let message  = selected_messages[i];
        let account  = await messenger.accounts.get(message.folder.accountId);
        let identity = account.identities[0];

        let tab_forward = await messenger.compose.beginForward(
          message.id,
          "forwardInline",
          {
            "to": destinatarios,
            "from": identity.email,
            "identityId": identity.id
          }
        );
        
        // Usar o "onBeforeSend" ?
        let result = await messenger.compose.sendMessage(tab_forward.id, {"mode": "sendNow"});
        console.log(result);
        // Usar o "onAfterSend" ?

        emails_sent += 1;
        await save_state();

        messenger.runtime.sendMessage({status: "sent"});
    }
    
    running = false;
    await save_state();

    messenger.runtime.sendMessage({status: "done"});
}

// --------------------------------------------------------------------------------------------------------
messenger.runtime.onMessage.addListener((message) => {
    if (message.action === "start"){
        forwardSelectedEmails( message.destinatarios ); // await ?
    } else if (message.action === "stop"){
        running = false;
        messenger.runtime.sendMessage({status: "done"});
    }
});

// --------------------------------------------------------------------------------------------------------