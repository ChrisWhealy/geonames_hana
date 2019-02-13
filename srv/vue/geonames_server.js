var eventBus = new Vue()

/**
 * =====================================================================================================================
 * Product Component
 * =====================================================================================================================
 */
Vue.component('geonames-server', {
  props: {
  }
, template : `
  <div class="admin-screen">
    <h1>{{ product }}</h1>

    <ul>
      <span class="tabs" 
        :class="{ activeTab: selectedTab === index }"
        v-for="(tab, index) in tabs"
          @click="selectedTab = index"
          :key="index">
        {{ tab }}
      </span>
    </ul>

    <div v-show="selectedTab === 0">
      <p>Tab 0 selected</p>
    </div>

    <div v-show="selectedTab === 1">
      <p>Tab 1 selected</p>
    </div>
  </div>
`
, data() {
    return {
      title           : "GeoNames Server using HANA"
    , adminScreenTabs : ["Country List", "Server Status"]
    , selectedTab     : 0
    }
  }
, methods : {
  }
, computed : {
  }
, mounted() {
    eventBus.$on('review-submitted', productReview => this.reviews.push(productReview))
  }
})

/**
 * =====================================================================================================================
 * Main Application
 * =====================================================================================================================
 */
var geonamesApp = new Vue({
  el: '#geonames-app'
, data : { }
, methods : {  }
})
