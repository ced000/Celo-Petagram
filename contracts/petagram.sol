// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;


interface IERC20Token {
    function transfer(address, uint256) external returns(bool);
    function approve(address,uint256) external returns(bool);
    function transferFrom(address, address, uint256) external returns(bool);
    function totalSupply() external view returns(uint256);
    function balanceOf(address) external view returns(uint256);
    function allowance(address, address) external view returns(uint256);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
}

contract Petagram {
    // initiazlize the postLength, defaults to 0
    uint256 internal postLength;
    
    // hold the cUSD token contract address, for a later reason
    address internal cUsdTokenContractAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
   
    // creating a struct datatype to hold user pet posts on the chain 
    struct Post {
        address payable owner;
        string title;
        string desc;
        uint256 likes;
        uint256 dislikes;
        string author;
        string imageURL;
        uint256 index;
    }
    
    struct User {
        string name;
        address user;
        bool voted;
        uint[] postsVoted;
        uint index;
    }
    
    // mapping to hold all user posts and users
    mapping(uint => Post) internal posts;
    mapping(address => User) internal usersMap;
    
    // a list of all the addresses that have visited us. 
    address[] internal addresses;
    
    function writePost(
        string memory _title,
        string memory _desc,
        string memory _author,
        string memory _imageURL
        ) public {
            uint _index = postLength;
            posts[postLength] = Post(
                payable(msg.sender),
                _title,
                _desc,
                0,
                0,
                _author,
                _imageURL,
                _index
            );
        postLength ++;
    }
        
    function readPost(uint _index) public view returns(
        address payable,
        string memory, 
        string memory,
        string memory, 
        string memory,
        uint,
        uint,
        uint
        ){
            Post storage post = posts[_index];
            
            return( post.owner, 
                    post.title,
                    post.desc,
                    post.author,
                    post.imageURL,
                    post.likes,
                    post.dislikes,
                    post.index
                );
        }
    
    function isCreated() public view returns(bool){
        if(addresses.length == 0) return false;
        address _address = msg.sender;
        return(addresses[usersMap[_address].index] == _address);
    }
        
    function createUser(string memory _name) public returns(bool) {
        if(isCreated()) revert("User already created for this address!");
        uint[] memory _postVoted;
        addresses.push(msg.sender);
        uint _index = addresses.length - 1;
        User memory newUser = User(_name,
                                    payable(msg.sender),
                                    false,
                                    _postVoted,
                                    _index);
        usersMap[msg.sender] = newUser;
        return true;
    }
    
    function readUser() public view returns(string memory, address){
        if(!isCreated()) revert('User does not exist yet!');
        require(msg.sender == usersMap[msg.sender].user, "Gerraway, You don't own this data!");
        return (usersMap[msg.sender].name,
                usersMap[msg.sender].user);
    }
        
    
    function getPostLength() public view returns(uint) {
        return postLength;
    }
    
    
    function postVoted(uint _counter) internal returns(bool) {
        uint _postIndex = posts[_counter].index;
        uint[] storage _postVoted = usersMap[msg.sender].postsVoted;
        if (_postVoted.length > 0) {
            for (uint i = 0; i < _postVoted.length; i++) {
                if (_postVoted[i] == _postIndex) {
                    usersMap[msg.sender].voted = true;
                    return (usersMap[msg.sender].voted);
                }
            }
        }
        usersMap[msg.sender].voted = false;
        return (usersMap[msg.sender].voted);
    }
    
    function postLike(uint _counter) public payable{
        uint[] storage _postVoted = usersMap[msg.sender].postsVoted;
        if (postVoted(_counter)) revert("Multiple Impressions disallowed");
        require(IERC20Token(cUsdTokenContractAddress).transferFrom(
            msg.sender,
            posts[_counter].owner,
            1e18), "Unable to Tip Post.");
        posts[_counter].likes++;
        _postVoted.push(posts[_counter].index);
    }
    
    function postDislike(uint _counter) public {
        uint[] storage _postVoted = usersMap[msg.sender].postsVoted;
        if(postVoted(_counter)) revert("Multiple Impressions disallowed");
        posts[_counter].dislikes++;
        _postVoted.push(posts[_counter].index);
    }
    
    
}