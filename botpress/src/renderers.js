module.exports = {
   '#dynamic-choice': data => {
      return [
         {
            on: 'webchat',
            type: 'carousel',
            typing: '1s',
            text: 'Leave Requests',
            settings: {
               responsive: [{ breakpoint: 400, settings: { slidesToShow: 1 } }]
            },
            elements: [
               {
                  title: 'Leave Requests',
                  subtitle: 'Click on the leave request to modify',
                  buttons: data.choices
               }
            ]
         }
      ]
   }
}
