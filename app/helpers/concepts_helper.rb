module ConceptsHelper

  ###BEGIN ruby equivalent of JS code in bp_ajax_controller.
  ###Note: this code used concepts/_details partial.
  UNIQUE_SPLIT_STR = '||||'
  def unique_class_id(cls_id, ont_acronym)
    return cls_id + UNIQUE_SPLIT_STR + ont_acronym
  end
  def unique_id_split(unique_id)
    return unique_id.split(UNIQUE_SPLIT_STR)
  end
  def get_link_for_cls_ajax(cls_id, ont_acronym)
    # ajax call will replace the href and label (triggered by class='cls4ajax')
    return "<a class='cls4ajax' href='#{unique_class_id(cls_id, ont_acronym)}'>#{cls_id}</a>"
  end
  def get_link_for_ont_ajax(ont_acronym)
    # ajax call will replace the acronym with an ontology name (triggered by class='ont4ajax')
    return "<a class='ont4ajax' href='/ontologies/#{ont_acronym}'>#{ont_acronym}</a>"
  end
  ###END ruby equivalent of JS code in bp_ajax_controller.

  def exclude_relation?(relation_to_check, ontology = nil)
    excluded_relations = [ "type", "rdf:type", "[R]", "SuperClass", "InstanceCount" ]

    # Show or hide property based on the property and ontology settings
    if ontology
      # TODO_REV: Handle obsolete classes
      # Hide owl:deprecated if a user has set class or property based obsolete checking
      # if !ontology.obsoleteParent.nil? && relation_to_check.include?("owl:deprecated") || !ontology.obsoleteProperty.nil? && relation_to_check.include?("owl:deprecated")
      #   return true
      # end
    end

    excluded_relations.each do |relation|
      return true if relation_to_check.include?(relation)
    end
    return false
  end

  def property_title(property)
    # TODO_REV: Get property names properly
    return ""
    ontology_properties = DataAccess.getOntologyPropertiesHash(@concept.ontology_id, "id")
    no_definition = "Property id: #{property} | Definition: No definition provided"
    if ontology_properties[property].nil? || ontology_properties[property].definitions.nil?
      no_definition
    else
      "Property id: #{property} | Definition: #{strip_tags(ontology_properties[property].definitions)}"
    end
  end

  def concept_properties2hash(properties)
    # NOTE: example properties
    #
    #properties
    #=> #<struct
    #  http://www.w3.org/2000/01/rdf-schema#label=
    #    [#<struct
    #      object="Etiological thing",
    #      string="Etiological thing",
    #      links=nil,
    #      context=nil>],
    #  http://stagedata.bioontology.org/metadata/def/prefLabel=
    #    [#<struct
    #      object="Etiological thing",
    #      string="Etiological thing",
    #      datatype="http://www.w3.org/2001/XMLSchema#string",
    #      links=nil,
    #      context=nil>],
    #  http://www.w3.org/2000/01/rdf-schema#comment=
    #    [#<struct  object="AD444", string="AD444", links=nil, context=nil>],
    #  http://scai.fraunhofer.de/NDDUO#Synonym=
    #    [#<struct  object="Etiology", string="Etiology", links=nil, context=nil>],
    #  http://www.w3.org/2000/01/rdf-schema#subClassOf=
    #    ["http://www.w3.org/2002/07/owl#Thing"],
    #  http://www.w3.org/1999/02/22-rdf-syntax-ns#type=
    #    ["http://www.w3.org/2002/07/owl#Class"],
    #  links=nil,
    #  context=nil>
    properties_data = {}
    keys = properties.members  # keys is an array of symbols
    for key in keys
      next if properties[key].nil?  # ignore :context and :links when nil.
      # Shorten the key into a simple label
      k = key.to_s if key.kind_of?(Symbol)
      k ||= key
      if k.start_with?("http")
        label = LinkedData::Client::HTTP.get("/ontologies/#{@ontology.acronym}/properties/#{CGI.escape(k)}/label").label rescue ""
        if label.nil? || label.empty?
          k = k.gsub(/.*#/,'')  # greedy regex replace everything up to last '#'
          k = k.gsub(/.*\//,'') # greedy regex replace everything up to last '/'
          # That might take care of nearly everything to be shortened.
          label = k
        end
      end
      begin
        # Try to simplify the property values, when they are a struct.
        values = properties[key].map {|v| v.string }
      rescue
        # Each value is probably a simple datatype already.
        values = properties[key]
      end
      data = { :key => key, :values => values }
      properties_data[label] = data
    end
    return properties_data
  end

end
