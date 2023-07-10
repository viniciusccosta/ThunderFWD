// --------------------------------------------------------------------------------------------------------
let ls_running       = false;
let ls_total_emails  = 0;
let ls_emails_sent   = 0;
let ls_destinatarios = [];

// --------------------------------------------------------------------------------------------------------
const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --------------------------------------------------------------------------------------------------------
async function read_local_storage() {
    let ls = await messenger.storage.local.get({
        running      : false,
        total_emails : 0,
        emails_sent  : 0,
        destinatarios: [],
    });

    ls_running       = ls.running;
    ls_total_emails  = ls.total_emails;
    ls_emails_sent   = ls.emails_sent;
    ls_destinatarios = ls.destinatarios;
}

async function update_local_storage() {
    /* Função responsável por salvar o valor atual das variáveis globais no localStorage. */

    await messenger.storage.local.set({
        running      : ls_running,
        total_emails : ls_total_emails,
        emails_sent  : ls_emails_sent,
        destinatarios: ls_destinatarios,
    });
}

async function init_popup() {
    await read_local_storage();

    if (ls_running) {
        freeze();
    }

    update_progress();
    update_table();

    if (ls_destinatarios.length > 0) {
        document.getElementById("btn_start").disabled = false;
    }
}

// --------------------------------------------------------------------------------------------------------
function new_uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

function addDestinatario(d) {
    let uuid = new_uuid();

    let tbody = document.getElementById("lista");

    let tr = document.createElement("tr");
    tr.setAttribute("data-id", uuid);

    let td1 = document.createElement("td");
    td1.innerText = d;
    tr.appendChild(td1);

    let td2 = document.createElement("td");
    let btn = document.createElement("button");
    let i = document.createElement("i");
    i.classList.add("bx", "bx-trash-alt");
    btn.appendChild(i);
    td2.appendChild(btn);

    tr.appendChild(td2);

    tbody.appendChild(tr);

    btn.addEventListener("click", () => delDestinatario(uuid));


}

async function delDestinatario(uuid) {
    // https://stackoverflow.com/a/66908123

    let table             = document.getElementById("lista");
    let elements          = Array.from(table.querySelectorAll("tr"));
    let element_to_delete = elements.find((el) => el.dataset.id === uuid);
    let destinatario      = element_to_delete.querySelector("td:first-child").innerText;

    let storage      = await messenger.storage.local.get({ destinatarios: [] });
    ls_destinatarios = storage.destinatarios;
    ls_destinatarios = ls_destinatarios.filter((item) => item != destinatario);
    await update_local_storage();

    table.removeChild(element_to_delete);

    if (ls_destinatarios.length == 0) {
        document.getElementById("btn_start").disabled = true;
    }
}

function validateDestinatario(destinatario) {
    let tbody = document.getElementById("lista");
    let destinatarios = tbody.querySelectorAll("tr > td:first-child");

    // Verifica se é um e-mail válido
    if (!email_regex.test(destinatario)) {
        return false;
    }

    // Verificando se é único:
    for (let i = 0; i < destinatarios.length; i++) {
        if (destinatarios[i].innerText === destinatario) {
            return false;
        }
    }

    return true;
}

function update_progress() {
    let bar = document.getElementById("bar");
    let txt = document.getElementById("progress_text");

    if (ls_total_emails > 0) {
        let width = parseInt((ls_emails_sent / ls_total_emails) * 100);

        if (width <= 100) {
            bar.style.width = width + "%";
            progress_text.innerHTML = `Enviado ${ls_emails_sent} de ${ls_total_emails}`;
        }
    } else {
        bar.style.width = "0%";
    }
}

function update_table() {
    for (let i = 0; i < ls_destinatarios.length; i++) {
        let destinatario = ls_destinatarios[i];
        addDestinatario(destinatario);
    }
}

function freeze() {
    let input = document.getElementById("input");
    let btn_start = document.getElementById("btn_start");
    // let btn_stop = document.getElementById("btn_stop");

    table_btns = document.querySelectorAll("tbody > tr > td:nth-child(2)");
    for (let i = 0; i < table_btns.length; i++) {
        table_btns[i].disabled = true;
    }

    input.disabled = true;
    btn_start.disabled = true;
    // btn_stop.disabled = false;
}

function unfreeze() {
    let input = document.getElementById("input");
    let btn_start = document.getElementById("btn_start");
    // let btn_stop = document.getElementById("btn_stop");

    table_btns = document.querySelectorAll("tbody > tr > td:nth-child(2)");
    for (let i = 0; i < table_btns.length; i++) {
        table_btns[i].disabled = false;
    }

    input.disabled = false;
    btn_start.disabled = false;
    // btn_stop.disabled = true;
}

// --------------------------------------------------------------------------------------------------------
document.getElementById("btn_start").addEventListener("click", (event) => {
    freeze();
    document.getElementById("progress_text").innerHTML = `Enviando...`;

    messenger.runtime.sendMessage({ action: "start" });
});

document.getElementById("input").addEventListener("keydown", async (event) => {
    if (event.key == "Enter") {
        let destinatario = event.target.value;

        if (destinatario !== "") {
            destinatario = destinatario.trim();

            if (!validateDestinatario(destinatario)) {
                document.getElementById("alert").hidden = false;
                return;
            }

            let storage      = await messenger.storage.local.get({ destinatarios: [] });
            ls_destinatarios = storage.destinatarios;
            ls_destinatarios.push(destinatario);
            await update_local_storage();

            addDestinatario(destinatario);
            event.target.value = "";

            if (ls_destinatarios.length > 0) {
                document.getElementById("btn_start").disabled = false;
            }
        }
    }

    document.getElementById("alert").hidden = true;
});

document.addEventListener("DOMContentLoaded", function () {
    init_popup();
});

messenger.runtime.onMessage.addListener(async (message) => {
    await read_local_storage();

    if (message.status === "done") {
        update_progress();
        unfreeze();
    } else if (message.status == "sent") {
        update_progress();
    }
});

// --------------------------------------------------------------------------------------------------------
