// History and navigation management
(function (window, undefined) {
  // Establish Variables
  var History = window.History;
  History.debug.enable = true;

  // Bind to State Change
  History.Adapter.bind(window, 'statechange', function () {
    var state = History.getState();
    autoSearch();
  });
}(window));

jQuery(document).ready(function(){
  // Wire advanced search categories
  jQuery("#search_categories").chosen({search_contains: true});
  jQuery("#search_button").button({search_contains: true});

  // Put cursor in search box by default
  jQuery("#search_keywords").focus();

  // Show/hide on refresh
  if (advancedOptionsSelected()) {
    jQuery("#search_options").removeClass("not_visible");
  }

  jQuery("#search_select_ontologies").change(function(){
    if (jQuery(this).is(":checked")) {
      jQuery("#ontology_picker_options").removeClass("not_visible");
    } else {
      jQuery("#ontology_picker_options").addClass("not_visible");
      jQuery("#ontology_ontologyId").val("");
      jQuery("#ontology_ontologyId").trigger("liszt:updated");
    }
  });

  jQuery("#search_results a.additional_results_link").live("click", function(event){
    event.preventDefault();
    var ontId = jQuery(this).attr("data-bp_additional_results_for");
    jQuery("#additional_results_"+ontId).toggleClass("not_visible");
    jQuery(this).children(".hide_link").toggleClass("not_visible");
    jQuery(this).toggleClass("not_underlined");
  });

  // Show advanced options
  jQuery("#advanced_options").click(function(event){
    jQuery("#search_options").toggleClass("not_visible");
    jQuery("#hide_advanced_options").toggleClass("not_visible");
  });

  // Events to run whenever search results are updated (mainly counts)
  jQuery(document).live("search_results_updated", function(){
    // Update count
    jQuery("#ontologies_count_total").html(currentOntologiesCount());

    // Tooltip for ontology counts
    updatePopupCounts();
    jQuery("#ont_tooltip").tooltip({
      position: "bottom right",
      opacity: "90%",
      offset: [-18, 5]
    });
  });

  // Perform search
  jQuery("#search_button").click(function(event){
    event.preventDefault();
    History.pushState(currentSearchParams(), document.title, "/search?"+objToQueryString(currentSearchParams()));
  });

  // Search on enter
  jQuery("#search_keywords").bind("keyup", function(event){
    if (event.which == 13) {
      jQuery("#search_button").click();
    }
  });

  // Details/visualize link to show details pane and visualize biomixer
  jQuery.facebox.settings.closeImage = '/javascripts/JqueryPlugins/facebox/closelabel.png';
  jQuery.facebox.settings.loadingImage = '/javascripts/JqueryPlugins/facebox/loading.gif';

  // Position of popup for details
  jQuery(document).bind("reveal.facebox", function(){
    if (jQuery("div.class_details_pop").is(":visible")) {
      jQuery("#facebox").css("max-height", jQuery(window).height() - (jQuery("#facebox").offset().top - jQuery(window).scrollTop()) * 2 + "px");
    }
  });

  // Use pop-up with flex via an iframe for "visualize" link
  jQuery("a.class_visualize").live("click", (function(){
    var acronym = jQuery(this).attr("data-bp_ontologyid");
    var conceptid = jQuery(this).attr("data-bp_conceptid");

    jQuery("#biomixer").html('<iframe src="/ajax/biomixer/?ontology='+acronym+'&conceptid='+conceptid+'" frameborder=0 height="500px" width="500px" scrolling="no"></iframe>').show();
    jQuery.facebox({ div: '#biomixer' });
  }));

  autoSearch();
});

// Automatically perform search based on input parameters
function autoSearch() {
  // Check for existing parameters/queries and update UI accordingly
  var params = BP_queryString();

  if ("q" in params || "query" in params) {
    var query = params["query"] || params["q"];
    jQuery("#search_keywords").val(query);

    if (params["exactmatch"] == "true" || params["exact_match"] == "true") {
      if (!jQuery("#search_exact_match").is(":checked"))
        jQuery("#search_exact_match").attr("checked", true);
    } else {
      jQuery("#search_exact_match").attr("checked", false);
    }

    if (params["searchproperties"] == "true" || params["include_properties"] == "true") {
      if (!jQuery("#search_include_properties").is(":checked"))
        jQuery("#search_include_properties").attr("checked", true);
    } else {
      jQuery("#search_include_properties").attr("checked", false);
    }

    if (params["require_definition"] == "true") {
      if (!jQuery("#search_require_definition").is(":checked"))
        jQuery("#search_require_definition").attr("checked", true);
    } else {
      jQuery("#search_require_definition").attr("checked", false);
    }

    if (params["include_views"] == "true") {
      if (!jQuery("#search_include_views").is(":checked"))
        jQuery("#search_include_views").attr("checked", true);
    } else {
      jQuery("#search_include_views").attr("checked", false);
    }

    if ("ontologyids" in params || "ontologies" in params) {
      var ontologyIds = params["ontologies"] || params["ontologyids"] || "";
      ontologyIds = ontologyIds.split(",");
      jQuery("#ontology_ontologyId").val(ontologyIds);
      jQuery("#ontology_ontologyId").trigger("liszt:updated");
    }

    if ("categories" in params) {
      var categories = params["categories"] || "";
      categories = categories.split(",");
      jQuery("#search_categories").val(categories);
      jQuery("#search_categories").trigger("liszt:updated");
    }
  }

  // Show/hide on refresh
  if (advancedOptionsSelected()) {
    jQuery("#search_options").removeClass("not_visible");
  }

  if (jQuery("#search_keywords").val() !== "")
    performSearch();
}

function currentSearchParams() {
  var params = {};

  // Search query
  params.q = jQuery("#search_keywords").val();

  // Ontologies
  var ont_val = jQuery("#ontology_ontologyId").val();
  params.ontologies = (ont_val === null) ? "" : ont_val.join(",");

  // Advanced options
  params.include_properties = jQuery("#search_include_properties").is(":checked");
  params.include_views = jQuery("#search_include_views").is(":checked");
  params.includeObsolete = jQuery("#search_include_obsolete").is(":checked");
  // params.includeNonProduction = jQuery("#search_include_non_production").is(":checked");
  params.require_definition = jQuery("#search_require_definition").is(":checked");
  params.exact_match = jQuery("#search_exact_match").is(":checked");
  params.categories = jQuery("#search_categories").val() || "";

  return params;
}

function objToQueryString(obj) {
  var str = [];
  for(var p in obj)
     str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  return str.join("&");
}

function performSearch() {
  jQuery("#search_spinner").show();
  jQuery("#search_messages").html("");

  var ont_val = jQuery("#ontology_ontologyId").val();

  var onts = (ont_val === null) ? "" : ont_val.join(",");
  var query = jQuery("#search_keywords").val();

  // Advanced options
  var includeProps = jQuery("#search_include_properties").is(":checked");
  var includeViews = jQuery("#search_include_views").is(":checked");
  var includeObsolete = jQuery("#search_include_obsolete").is(":checked");
  var includeNonProduction = jQuery("#search_include_non_production").is(":checked");
  var includeOnlyDefinitions = jQuery("#search_require_definition").is(":checked");
  var exactMatch = jQuery("#search_exact_match").is(":checked");
  var categories = jQuery("#search_categories").val() || "";

  jQuery.ajax({
    url: jQuery(document).data().bp.config.rest_url+"/search",
    data: {
      q: query,
      include_properties: includeProps,
      include_views: includeViews,
      obsolete: includeObsolete,
      include_non_production: includeNonProduction,
      require_definition: includeOnlyDefinitions,
      exact_match: exactMatch,
      categories: categories,
      ontologies: onts,
      pagesize: 150,
      apikey: jQuery(document).data().bp.config.apikey,
      userapikey: jQuery(document).data().bp.config.userapikey,
      format: "jsonp"
    },
    dataType: "jsonp",
    success: function(data){
      var results = [];
      var ontologies = {};
      var ontology_links = [];
      var ontologyResults;

      if (categories.length > 0) {
        data.collection = filterCategories(data.collection, categories);
      }

      if (!jQuery.isEmptyObject(data)) {
        ontologyResults = aggregateResults(data.collection);
        jQuery(ontologyResults).each(function(){
          results.push(formatSearchResults(this));
        });
      }

      // Display error message if no results found
      var result_count = jQuery("#result_stats");
      if (data.collection.length === 0) {
        result_count.html("");
        jQuery("#search_results").html("<h2 style='padding-top: 1em;'>No matches found</h2>");
      } else {
        var results_by_ont = jQuery("#ontology_ontologyId").val() === null ? "<a id='ont_tooltip' href='javascript:void(0);'>Matches in <span id='ontologies_count_total'>" + ontologyResults.length + "</span> ontologies</a><div id='ontology_counts' class='ontology_counts_tooltip'/>" : "";
        result_count.html(results_by_ont);
        jQuery("#search_results").html(results.join(""));
      }

      jQuery("a[rel*=facebox]").facebox();
      jQuery("#search_results").show();
      jQuery("#search_spinner").hide();
    },
    error: function(){
      jQuery("#search_spinner").hide();
      jQuery("#search_results").hide();
      jQuery("#search_messages").html("<span style='color: red'>Problem searching, please try again");
    }
  });
}

function aggregateResults(results) {
  var ontologies = {};
  var resultsByOntology = [];

  for (var i in results) {
    var res = results[i];
    if (typeof ontologies[res.links.ontology] === "undefined") {
      ontologies[res.links.ontology] = [];
    }

    ontologies[res.links.ontology].push(res);
  }

  for (var j in ontologies) {
    resultsByOntology.push(ontologies[j]);
  }

  return resultsByOntology;
}

function formatSearchResults(ontologyResults) {
  var res = ontologyResults.shift();
  var additional_results = "";
  var additional_results_link = "";
  var label_html = markupClass(res);
  var row;
  var additional_rows = [];

  // Process additional results if any
  if (ontologyResults.length > 0) {
    var shortOntId = ontologyIdToAcronym(res.links.ontology);
    additional_results_link = jQuery("<span/>")
      .append(jQuery("<span/>")
      .addClass("additional_results_link search_result_link")
      .html(" - <a href='#additional_results' class='additional_results_link' data-bp_additional_results_for='"+shortOntId+"'>" + (ontologyResults.length) + " more from this ontology<span class='not_visible hide_link'>[hide]</span></a>")).html();

    jQuery(ontologyResults).each(function(){
      additional_rows.push([
        "<div class='search_result_additional'>",
        classHTML(this, markupClass(this), false),
        definitionHTML(this, "additional_def_container"),
        "<div class='search_result_links'>"+resultLinksHTML(this)+"</div>",
        "</div>"
      ].join(""));
    });

    additional_results = jQuery("<div/>")
                                .append(jQuery("<div/>")
                                .attr("id", "additional_results_"+shortOntId)
                                .addClass("additional_results")
                                .addClass("not_visible")
                                .html(additional_rows.join("")))
                                .html();
  }

  row = [
    "<div class='search_result' data-bp_ont_id='"+res.links.ontology+"'>",
    classHTML(res, label_html, true),
    definitionHTML(res),
    "<div class='search_result_links'>"+resultLinksHTML(res) + additional_results_link+"</div>",
    additional_results,
    "</div>"
  ];

  return row.join("");
}

function updatePopupCounts() {
  var ontologies = [];
  jQuery("#search_results div.search_result").each(function(){
    var result = jQuery(this);
    // Add one to the additional results to get total count (1 is for the primary result)
    var resultsCount = result.children("div.additional_results").find("div.search_result_additional").length + 1;
    ontologies.push(result.attr("data-bp_ont_name")+" <span class='popup_counts'>"+resultsCount+"</span><br/>");
  });

  // Sort using case insensitive sorting
  ontologies.sort(function(x, y){
    var a = String(x).toUpperCase();
    var b = String(y).toUpperCase();
    if (a > b)
       return 1;
    if (a < b)
       return -1;
    return 0;
  });

  jQuery("#ontology_counts").html(ontologies.join(""));
}

function markupClass(cls) {
  // Wrap the class prefLabel in a span, indicating that the class is obsolete if necessary.
  var max_word_length = 60;
  var label_text = (cls.prefLabel.length > max_word_length) ? cls.prefLabel.substring(0, max_word_length) + "..." : cls.prefLabel;
  var label_html = jQuery("<span/>").addClass('prefLabel').append(label_text);
  if (cls.obsolete === true){
    label_html.removeClass('prefLabel');
    label_html.addClass('obsolete_class');
    label_html.attr('title', 'obsolete class');
  }
  return label_html; // returns a jQuery object; use .prop('outerHTML') to get markup text.
}

function filterCategories(results, filterCats) {
  var newResults = [];
  jQuery(results).each(function(){
    var result = this;
    var acronym = ontologyIdToAcronym(result.links.ontology);
    jQuery(filterCats).each(function(){
      if (categoriesMap[this].indexOf(acronym) > -1) {
        newResults.push(result);
      }
    });
  });
  return newResults;
}

function shortenDefinition(def) {
  var defLimit = 210;

  if (typeof def !== "undefined" && def !== null && def.length > 0) {
    // Make sure definitions isn't an array
    def = (typeof def === "string") ? def : def.join(". ");

    // Strip out xml elements and/or html
    def = jQuery("<div/>").html(def).text();

    if (def.length > defLimit) {
      var defWords = def.slice(0, defLimit).split(" ");
      // Remove the last word in case we got one partway through
      defWords.pop();
      def = defWords.join(" ")+" ...";
    }
  }

  jQuery(document).trigger("search_results_updated");
  return def || "";
}

function advancedOptionsSelected() {
  if (document.URL.indexOf("opt=advanced") >= 0) {
    return true;
  }

  var check = [
    function(){return jQuery("#search_include_properties").is(":checked");},
    function(){return jQuery("#search_include_views").is(":checked");},
    function(){return jQuery("#search_include_non_production").is(":checked");},
    function(){return jQuery("#search_include_obsolete").is(":checked");},
    function(){return jQuery("#search_only_definitions").is(":checked");},
    function(){return jQuery("#search_exact_match").is(":checked");},
    function(){return jQuery("#search_categories").val() !== null && jQuery("#search_categories").val().length > 0;},
    function(){return jQuery("#ontology_ontologyId").val() !== null && jQuery("#ontology_ontologyId").val().length > 0;}
  ];

  var length = check.length;
  for (var i = 0; i < length; i++) {
    var selected = check[i]();
    if (selected)
      return true;
  }

  return false;
}

function ontologyIdToAcronym(id) {
  return id.split("/").slice(-1)[0];
}

function getOntologyName(cls) {
  var ont = jQuery(document).data().bp.ontologies[cls.links.ontology];
  if (typeof ont === 'undefined')
    return "";
  return " - " + ont.name + " (" + ont.acronym + ")";
}

function currentResultsCount() {
  return jQuery(".search_result").length + jQuery(".search_result_additional").length;
}

function currentOntologiesCount() {
  return jQuery(".search_result").length;
}

function classHTML(res, label_html, displayOntologyName) {
  var title = " title='" + res.prefLabel + "' ";
  var conceptIdCode = encodeURIComponent(res["@id"]);
  var dataConceptId = " data-bp_conceptid='" + conceptIdCode + "' ";
  var dataExactMatch = " data-exact_match='" + res.exactMatch + "' ";
  var linkHref = " href='/ontologies/" + ontologyIdToAcronym(res.links.ontology) + "?p=classes&conceptid=" + conceptIdCode + "' ";
  var ontologyName = displayOntologyName ? getOntologyName(res) : "";
  return "" +
  "<div class='class_link'>" +
    "<a " + title + dataConceptId + dataExactMatch + linkHref + "> " +
      label_html.prop('outerHTML') + ontologyName +
    "</a> " +
    "<div class='concept_uri'>" +
      res["@id"] +
    "</div> " +
  "</div> ";
}

function resultLinksHTML(res) {
  var ont_id = res.links.ontology;
  var ont_acronym = ontologyIdToAcronym(ont_id);
  var cls_id = res["@id"];
  var cls_id_encode = encodeURIComponent(cls_id);
  // construct class 'details'
  var details_href = "href='" + "/ajax/class_details?ontology=" + ont_acronym + "&conceptid=" + cls_id_encode + "&styled=false" + "'";
  var details_css_class = " class='class_details search_result_link'" ;
  var details_rel = " rel='facebox[.class_details_pop]'";
  var details_anchor = "<a " + details_href + details_css_class + details_rel + ">details</a>";
  // construct 'visualize'
  var viz_href = "href='javascript:void(0);'";
  var viz_css_class = " class='class_visualize search_result_link'" ;
  var viz_data_ont = " data-bp_ontologyid='" + ont_acronym + "'";
  var viz_data_cls = " data-bp_conceptid='" + cls_id_encode + "'";
  var viz_anchor = "<a " + viz_href + viz_css_class + viz_data_ont + viz_data_cls + ">visualize</a>";
  return "<span class='additional'>" + details_anchor +  " - " + viz_anchor + "</span>";
}

function definitionHTML(res, defClass) {
  defClass = typeof defClass === "undefined" ? "def_container" : defClass;
  return "<div class='"+defClass+"'>"+shortenDefinition(res.definition)+"</div>";
}
