function hostsInit () {
	var $table_header = $(".header-fixed > thead");
    var $table_header_tr = $(".header-fixed > thead > tr");
    var $table_body = $(".header-fixed > tbody");
    var scrollBarSize = getBrowserScrollSize();
    var $btn_refresh = $("#btn_refresh");
    var $btn_create = $("#btn_create");
    var $btn_search = $("#btn_search");
    var $btn_host_create = $('#form_create #btn_create');
    var $btn_host_update = $('#form_update #btn_update');
    var $btn_host_delete = $('#form_delete #btn_delete');
    var hosts_info = {};
    var delete_host = '';
    var filter_type = "";
    var filter_value = "";
    var current_page = 1;
    var current_page_size = 50;
    var service_host = window.location.host;

    getHostList();
    $btn_refresh.bind('click', refreshPage);
    $btn_create.bind('click', showCreate);
    $btn_search.bind('click', search);
    $btn_host_create.bind('click', createHost);
    $("#create_modal").on("hidden.bs.modal", resetModal);
    $("#update_modal").on("hidden.bs.modal", resetModal);
    $btn_host_update.bind('click', updateHost);
    $btn_host_delete.bind('click', deleteHost);

    function showCreate() {
        $('#create_modal').modal('show');
    }

    function createHost() {
        var data = {};
        data.host = $('#form_create input#host').val();
        data.ip = $('#form_create input#ip').val();
        data.enable = $('#form_create input#enable').is(":checked");
        $('#create_modal').modal('hide');
        showWaitScreen();
        $.ajax({
            type: "POST",
            url: "http://" + service_host + "/host/create",
            data: JSON.stringify(data),
            dataType: "json",
            contentType: false,
            processData: false,
            success: function(data) {
                if (data.result != "ok") {
                    showWarningToast("operation failed", data.message);
                }
                getHostList();
            },
            error: function() {
                showWarningToast("error", "request service failed");
            }
        });
    }

    function getHostList(host) {
        var url = "http://" + service_host + "/host/list?offset=" + ((current_page - 1) * current_page_size) + "&limit=" + current_page_size;
        if (filter_type) {
            url += "&" + filter_type + "=" + filter_value;
        }
        $.ajax({
            dataType: "json",
            url: url,
            success: function(data) {
                if (data.result != "ok") {
                    showWarningToast("operation failed", data.message);
                }
                $table_header_tr.empty();
                $table_body.empty();
                $table_header_tr.append(getHeaderTR('num', 'num', '#'));
                $table_header_tr.append(getHeaderTR('host', 'host', 'host'));
                $table_header_tr.append(getHeaderTR('ip', 'ip', 'ip'));
                $table_header_tr.append(getHeaderTR('create_at', 'create at', 'create at'));
                $table_header_tr.append(getHeaderTR('update_at', 'update at', 'update at'));
                $table_header_tr.append(getHeaderTR('enable', 'enable', 'enable'));
                $table_header_tr.append(getHeaderTR('operation', 'operation', 'operation'));
                var columns = [
                    "num",
                    "host",
                    "ip",
                    "create_at",
                    "update_at",
                    "enable",
                    "operation"
                ];
                hosts_info = {};
                data.hosts.forEach(function (value, index, arrays) {
                    hosts_info[value["host"]] = value;
                    var tr = '<tr id="table_item">';
                    for (var i=0; i<columns.length; i++) {
                        var col = columns[i];
                        if (col == 'num') {
                            tr += '<td id="' + col + '"><div class="outer"><div class="inner">&nbsp;' + ((current_page - 1) * current_page_size + index + 1) + '</div></div></td>';
                        } else if (col == 'operation') {
                            tr += '<td id="' + col + '"><div class="outer"><div class="inner">';
                            tr += '<button id="' + value["host"] + '" type="button" class="btn btn-secondary btn-sm btn-operation btn-update" onclick="this.blur();"><span class="oi oi-arrow-circle-top" title="update" aria-hidden="true"></span></button>';
                            tr += '<button id="' + value["host"] + '" type="button" class="btn btn-secondary btn-sm btn-operation btn-delete" onclick="this.blur();"><span class="oi oi-circle-x" title="delete" aria-hidden="true"></span></button>';
                            tr += '</div></div></td>';
                        } else if (col == 'host' || col == 'ip') {
                            tr += '<td id="' + col + '"><div class="outer"><div class="inner"><span class="span-pre">' + value[col] + '</span></div></div></td>';
                        } else {
                            tr += '<td id="' + col + '"><div class="outer"><div class="inner">&nbsp;' + value[col] + '</div></div></td>';
                        }
                    }
                    tr += '</tr>';
                    $table_body.append(tr);
                });

                var tbody = document.getElementById("table_body");
                if (hasVerticalScrollBar(tbody)) {
                    $table_header.css({"margin-right": scrollBarSize.width});
                }
                else {
                    $table_header.css({"margin-right": 0});
                }

                addColumnsCSS(columns);
                $(".btn-update").bind('click', showHostUpdate);
                $(".btn-delete").bind('click', showHostDelete);

                generatePagination(current_page, current_page_size, 5, data.total);
                $('a.page-num').bind('click', changePage);
                $('a.previous-page').bind('click', previousPage);
                $('a.next-page').bind('click', nextPage);

                hideWaitScreen();
                $btn_refresh.removeAttr("disabled");
            },
            error: function() {
                showWarningToast("error", "request service failed");
                hideWaitScreen();
                $btn_refresh.removeAttr("disabled");
            }
        });
    }

    function refreshPage() {
        $btn_refresh.attr("disabled", "disabled");
        getHostList();
    }

    function search() {
        filter_type = $('#filter').val();
        filter_value = $('input#filter_input').val();
        current_page = 1;
        getHostList();
    }

    function showHostUpdate() {
        var host = $(this).attr("id");
        var info = hosts_info[host];
        $('#form_update input#host').val(host);
        $('#form_update input#ip').val(info.ip);
        $('#form_update input#enable').prop("checked", info.enable);
        $('#update_modal').modal('show');
    }

    async function updateHost() {
        var data = {};
        data.host = $('#form_update input#host').val();
        var ip = $('#form_update input#ip').val();
        if (ip != "") {
            data.ip = ip;
        }
        data.enable = $('#form_update input#enable').is(":checked");
        $('#update_modal').modal('hide');
        showWaitScreen();
        await sleep(1000);
        $.ajax({
            type: "PUT",
            url: "http://" + service_host + "/host/update",
            data: JSON.stringify(data),
            dataType: "json",
            contentType: false,
            processData: false,
            success: function(data) {
                if (data.result != "ok") {
                    showWarningToast("operation failed", data.message);
                }
                getHostList();
            },
            error: function() {
                showWarningToast("error", "request service failed");
            }
        });
    }

    function showHostDelete() {
        delete_host = $(this).attr("id");
        $('#delete_modal').modal('show');
    }

    async function deleteHost() {
        $('#delete_modal').modal('hide');
        showWaitScreen();
        await sleep(1000);
        $.ajax({
            type: "DELETE",
            url: "http://" + service_host + "/host/delete?host=" + delete_host,
            contentType: false,
            processData: false,
            success: function(data) {
                if (data.result != "ok") {
                    showWarningToast("operation failed", data.message);
                }
                getHostList();
            },
            error: function() {
                showWarningToast("error", "request service failed");
            }
        });
    }

    function changePage() {
        current_page = Number($(this)[0].innerText);
        getHostList();
    }

    function previousPage() {
        current_page--;
        if (current_page < 1) {
            current_page = 1;
        }
        getHostList();
    }

    function nextPage() {
        current_page++;
        getHostList();
    }

    function resetModal(e) {
        $("#" + e.target.id).find("input:text").val("");
        $("#" + e.target.id).find("input:file").val(null);
        $("#" + e.target.id).find("textarea").val("");
    }

    function addColumnsCSS(keys) {
        var percent = 100.00;
        if (is_in('num', keys)) {
            $('th#num').css("width", "5%");
            $('td#num').css("width", "5%");
            percent -= 5.0;
        }
        if (is_in('ip', keys)) {
            $('th#ip').css("width", "10%");
            $('td#ip').css("width", "10%");
            percent -= 10.0;
        }
        if (is_in('create_at', keys)) {
            $('th#create_at').css("width", "10%");
            $('td#create_at').css("width", "10%");
            percent -= 10.0;
        }
        if (is_in('update_at', keys)) {
            $('th#update_at').css("width", "10%");
            $('td#update_at').css("width", "10%");
            percent -= 10.0;
        }
        if (is_in('enable', keys)) {
            $('th#enable').css("width", "10%");
            $('td#enable').css("width", "10%");
            percent -= 10.0;
        }
        if (is_in('operation', keys)) {
            $('th#operation').css("width", "8%");
            $('td#operation').css("width", "8%");
            percent -= 8.0;
        }
        if (is_in('host', keys)) {
            var width = percent;
            $('th#host').css("width", width + "%");
            $('td#host').css("width", width + "%");
        }
    }
}