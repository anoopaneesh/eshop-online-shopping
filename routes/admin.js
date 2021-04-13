var express = require('express');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var adminHelper = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');
/* GET users listing. */
async function verifyAdminLogin(req, res, next) {
  if (req.session.admin) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}

router.get('/', verifyAdminLogin, function (req, res, next) {
  productHelper.getAllProducts().then((products) => {
    res.render('admin/view-products', { products, admin: req.session.admin});
    req.session.loginErr = null
  })

});

router.get('/login', (req, res) => {
  res.render('admin/login',{loginErr:req.session.loginErr})
})

router.post('/login', (req, res) => {
  adminHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.adminLoggedIn = true
      res.redirect('/admin')
    } else {
      req.session.loginErr = 'Invalid email or password'
      res.redirect('/admin/login')
      req.session.loginErr = null
    }
    
  })
})

router.get('/logout',(req,res)=>{
  req.session.admin = null
  req.session.adminLoggedIn = false
  res.redirect('/')
})

router.get('/add-product', verifyAdminLogin, (req, res) => {
  res.render('admin/add-products',{admin:req.session.admin})
})
router.post('/add-product', (req, res) => {
  if (!req.session.admin) {
    res.redirect('/admin/login')
  } else {
    let proObj = {
      ...req.body,
      price: parseInt(req.body.price)
    }
    productHelper.addProduct(proObj, (id) => {
      const image = req.files.image
      image.mv(`./public/images/${id}.jpg`, (err) => {
        if (err) console.log(err)
      })
    })
    res.redirect('/admin')
  }
})

router.get('/delete-product/:id',verifyAdminLogin,(req, res) => {
  let productId = req.params.id
  productHelpers.deleteProduct(productId).then((response) => {
    res.redirect('/admin/')
  })
})

router.get('/edit-product/:id',verifyAdminLogin,(req, res) => {
  let productId = req.params.id
  productHelpers.getProduct(productId).then((product) => {
    res.render('admin/edit-product', { product,admin:req.session.admin })
  })
})

router.post('/edit-product/:id', (req, res) => {
  let productId = req.params.id
  productHelpers.updateProduct(productId, req.body).then(() => {
    res.redirect('/admin')
    let image = req.files.image
    image.mv(`./public/images/${productId}.jpg`)
  })
})

router.get('/all-orders',verifyAdminLogin,(req, res) => {
  adminHelper.getAllOrders().then((orders) => {
    res.render('admin/all-orders', { orders,admin:req.session.admin })
  })
})
router.get('/approve-order/:id',verifyAdminLogin,(req, res) => {
  adminHelper.approveOrder(req.params.id).then((response) => {
    res.json({ status: true })
  })
})

module.exports = router;
