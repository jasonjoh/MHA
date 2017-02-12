/// <reference path="Table.js" />
/// <reference path="Strings.js" />
/// <reference path="~/Scripts/Headers.js" />
/// <reference path="~/Scripts/siteTypesOffice.js" />
// This function is run when the app is ready to start interacting with the host application.
// It ensures the DOM is ready before updating the span elements with values from the current message.
Office.initialize = function () {
    $(document).ready(function () {
        $(window).resize(onResize);
        initViewModels();
        updateStatus(ImportedStrings.mha_loading);
        sendHeadersRequest();
    });
};

function enableSpinner() {
    $("#response").css("background-image", "url(../Resources/loader.gif)");
    $("#response").css("background-repeat", "no-repeat");
    $("#response").css("background-position", "center");
}

function disableSpinner() {
    $("#response").css("background", "none");
}

function processHeaders(headers) {
    updateStatus(ImportedStrings.mha_foundHeaders);
    parseHeadersToTables(headers);
}

function sendHeadersRequest() {
    updateStatus(ImportedStrings.mha_RequestSent);
    enableSpinner();
    Office.context.mailbox.getCallbackTokenAsync({ isRest: true }, function (result) {
        if (result.status === "succeeded") {
            var accessToken = result.value;
            getHeaders(accessToken);
        } else {
            disableSpinner();
            updateStatus("Unable to obtain callback token.");
        }
    });
}

function getItemRestId() {
    // Currently the only Outlook Mobile version that supports add-ins
    // is Outlook for iOS.
    if (Office.context.mailbox.diagnostics.hostName === "OutlookIOS") {
        // itemId is already REST-formatted
        return Office.context.mailbox.item.itemId;
    } else {
        // Convert to an item ID for API v2.0
        return Office.context.mailbox.convertToRestId(
          Office.context.mailbox.item.itemId,
          Office.MailboxEnums.RestVersion.v2_0
        );
    }
}

function displayError(error) {
    disableSpinner();
    updateStatus(ImportedStrings.mha_failedToFind);
    viewModel.originalHeaders = error;
    rebuildSections();
}

function getHeaders(accessToken) {
    // Get the item's REST ID
    var itemId = getItemRestId();

    // Office.context.mailbox.restUrl appears to always be null, so we hard code our url
    var getMessageUrl = 'https://outlook.office.com' +
        "/api/v2.0/me/messages/" +
        itemId +
        // PR_TRANSPORT_MESSAGE_HEADERS
        "?select=SingleValueExtendedProperties&$expand=SingleValueExtendedProperties($filter=PropertyId eq 'String 0x007D')";

    $.ajax({
        url: getMessageUrl,
        dataType: "json",
        headers: { "Authorization": "Bearer " + accessToken }
    }).done(function(item) {
        processHeaders(item.SingleValueExtendedProperties[0].Value);
    }).fail(function(error) {
        displayError(JSON.stringify(error, null, 2));
    }).always(function() {
        disableSpinner();
    });
}