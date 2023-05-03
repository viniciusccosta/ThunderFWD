let running = false;

messenger.browserAction.onClicked.addListener((tab,info) => {
  running = !running;
  if (running){
    forwardSelectedEmails(tab);
  }

  // TODO: Ativar e desativar o botão (ou alterar o botão...)
})

async function forwardSelectedEmails(tab) {
  let selected_messages = await messenger.mailTabs.getSelectedMessages(tab.id);

  selected_messages = selected_messages.messages;

  for (let i = 0; i < selected_messages.length; i++){
    if (!running){
      break;
    }

    let message  = selected_messages[i];
    let account  = await messenger.accounts.get(message.folder.accountId);
    let identity = account.identities[0];

    // TODO: Permitir o usuário inserir novas informações e, principalmente, destinatários.

    let tab_forward = await messenger.compose.beginForward(
      message.id,
      "forwardInline",
      {
        "to": [
          "teste@gmail.com",
        ],
        "from": identity.email,
        "identityId": identity.id
      }
    );
    
    let result = await messenger.compose.sendMessage(tab_forward.id, {"mode": "sendNow"});
    console.log(result);
  }

  running = false;
}