module Mixins::CustomButtons
  extend ActiveSupport::Concern

  def get_tree_aset_kids_for_nil_id(object, count_only)
    count_only ? get_custom_buttons(object).count : get_custom_buttons(object).sort_by { |a| a.name.downcase }
  end

  def buttons_ordered?(object)
    !!(object[:set_data] && object[:set_data][:button_order])
  end

  def x_get_tree_aset_kids(object, count_only)
    if object.id.nil?
      get_tree_aset_kids_for_nil_id(object, count_only)
    elsif count_only
      object.members.count
    else
      button_order = buttons_ordered?(object) ? object[:set_data][:button_order] : nil
      Array(button_order).each_with_object([]) do |bidx, arr|
        object.members.each { |b| arr.push(b) if bidx == b.id && !arr.include?(b) }
      end
    end
  end

  def get_custom_buttons(object)
    # FIXME: don't we have a method for the splits?
    # FIXME: cannot we ask for the null parent using Arel?
    CustomButton.buttons_for(object.name.split('|').last.split('-').last).select do |uri|
      uri.parent.nil?
    end
  end

  def custom_toolbar?
    return nil unless self.class.instance_eval { @custom_buttons }

    @explorer ? custom_toolbar_explorer? : custom_toolbar_simple?
  end

  def custom_toolbar_explorer?
    if x_tree                # Make sure we have the trees defined
      if x_node == "root" || # If on a root, create placeholder toolbar
         !@record            #   or no record showing
        :blank
      elsif @display == "main"
        true
      else
        :blank
      end
    end
  end

  def custom_toolbar_simple?
    @record && @lastaction == "show" && @display == "main"
  end

  class_methods do
    def has_custom_buttons
      @custom_buttons = true
    end
  end
end
